import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import {
  CompanyEssentialMetadata,
  DocumentHistoriesSchema,
} from "./metadata.mjs";
import { callGeminiWithRetry } from "./gemini-config.mjs";

const MIME_TYPE_TEXT_PLAIN = "text/plain";
const MIME_TYPE_PDF = "application/pdf";

export async function processSingleFile(
  filePath,
  outputFolder,
  file,
  metadataModelInstance
) {
  let fileBase64;
  let mimeType;

  console.log(`Processing ${file}...`);

  try {
    if (file.endsWith(".docx")) {
      try {
        // Read .docx file and convert to plain text using Mammoth
        const docxBuffer = await fs.readFile(filePath);
        const { value: plainText } = await mammoth.extractRawText({
          buffer: docxBuffer,
        });
        fileBase64 = Buffer.from(plainText, "utf-8").toString("base64");
        mimeType = MIME_TYPE_TEXT_PLAIN;
        console.log(`Converted ${file} to plain text.`);
      } catch (conversionError) {
        console.error(
          `Error converting ${file} to plain text:`,
          conversionError
        );
        return {
          status: "error",
          file,
          reason: "conversion_error",
          error: conversionError,
        };
      }
    } else if (file.endsWith(".pdf")) {
      // Read .pdf file directly as a buffer
      const fileBuffer = await fs.readFile(filePath);
      fileBase64 = fileBuffer.toString("base64");
      mimeType = MIME_TYPE_PDF;
    } else {
      console.warn(
        `Skipping unsupported file type in processing function: ${file}`
      );
      return {
        status: "skipped",
        file,
        reason: "unsupported_type_in_processing",
      };
    }

    // Prepare file data for Gemini API
    const filePart = {
      inlineData: { data: fileBase64, mimeType: mimeType },
    };
    // Construct the prompt for Gemini. The schema is now passed in generationConfig.
    const metadataPrompt = `Analyze the attached document and extract essential company metadata.
Strictly follow the provided JSON schema. For fields where information is not found or you are not 100% certain, use null.
Ensure results are in Greek. Make sure to use only the choices from the enums where applicable.`;

    const generationConfigForMetadata = {
      responseMimeType: "application/json",
      responseSchema: CompanyEssentialMetadata,
    };

    let metadataTextResponse;
    try {
      // Call Gemini API to extract metadata, now passing generationConfig
      metadataTextResponse = await callGeminiWithRetry(
        metadataModelInstance,
        [metadataPrompt, filePart],
        file,
        generationConfigForMetadata // Pass the generation config
      );
    } catch (genError) {
      return {
        status: "error",
        file,
        reason: genError.isRateLimitExhaustion
          ? "gemini_max_retries_exceeded"
          : "gemini_metadata_error",
        error: genError,
      };
    }

    try {
      let metadataJsonContent = JSON.parse(metadataTextResponse);
      const metadataJsonFilePath = path.join(
        outputFolder,
        "pdf_metadata",
        file.replace(/\.(pdf|docx)$/, ".json")
      );

      // Create the pdf_metadata directory if it doesn't exist
      const metadataDir = path.join(outputFolder, "pdf_metadata");
      await fs.mkdir(metadataDir, { recursive: true });

      // Save the extracted metadata to a JSON file
      await fs.writeFile(
        metadataJsonFilePath,
        JSON.stringify(metadataJsonContent, null, 4),
        "utf-8"
      );
      console.log(`Metadata written to ${metadataJsonFilePath}`);

      return {
        status: "success",
        file,
        data: { sourceFile: file, metadata: metadataJsonContent },
      };
    } catch (jsonError) {
      console.error(
        `Error parsing JSON response for metadata of ${file}:`,
        jsonError
      );
      console.log("Raw response from Gemini:", metadataTextResponse);
      return {
        status: "error",
        file,
        reason: "json_parse_error",
        error: jsonError,
        rawResponse: metadataTextResponse,
      };
    }
  } catch (fileProcessingError) {
    console.error(`Unexpected error processing ${file}:`, fileProcessingError);
    return {
      status: "error",
      file,
      reason: "unknown_processing_error",
      error: fileProcessingError,
    };
  }
}

export async function generateContextualHistories(
  allExtractedMetadata,
  outputFolder,
  userInputGemiId,
  historyModelInstance
) {
  console.log(
    `\nRequesting contextual history segments for ${allExtractedMetadata.length} documents under GEMI_ID: ${userInputGemiId}...`
  );

  // Sort metadata by document date to provide chronological context to Gemini
  allExtractedMetadata.sort((a, b) => {
    const dateA = a.metadata?.document_date
      ? new Date(a.metadata.document_date)
      : null;
    const dateB = b.metadata?.document_date
      ? new Date(b.metadata.document_date)
      : null;

    if (dateA && dateB) return dateA - dateB;
    if (dateA) return -1; // Documents with dates come before those without
    if (dateB) return 1;
    return 0; // Keep original order if both lack dates or dates are equal
  });

  console.log(
    "\nSorted metadata by document_date (oldest first, errors/missing last):"
  );
  allExtractedMetadata.forEach((item) => {
    console.log(
      `  - ${item.sourceFile}: ${item.metadata?.document_date || "No Date"}`
    );
  });

  // Construct a detailed prompt for Gemini to generate history segments
  // The schema is now passed in generationConfig.
  const historyPromptParts = [
    `You are provided with a collection of metadata extracted from multiple documents related to a company (or entities under the GEMI_ID: ${userInputGemiId}). The collection is sorted by the document's date, where available, from oldest to newest.`,
    `Your task is to generate a specific "historySegment" for EACH document's metadata provided in the 'CollectedMetadata' array.`,
    `When generating the 'historySegment' for a particular document, you MUST consider the information from ALL other documents in the collection (especially those chronologically preceding it) to:`,
    `  - Create a coherent narrative piece for that document reflecting its place in the timeline.`,
    `  - Reflect any evolution or changes observed across the documents (e.g., changes in address, board members, financial status over time as indicated by different documents).`,
    `  - Highlight the specific contribution or information relevance of the current document in the context of the others and the established timeline.`,
    `The output must be a JSON object containing a single key "documentHistories".`,
    `The value of "documentHistories" must be an ARRAY of objects. Each object in this array must correspond to one of the input documents and contain:`,
    `  1. "sourceFile": The original filename from the input metadata. THIS MUST MATCH THE INPUT SOURCE FILE NAME.`,
    `  2. "historySegment": A string in GREEK, representing the synthesized history/narrative for that specific document, in the context of all others.`,
    `Be concise and clear in your history segments. Avoid unnecessary details or overly complex language. Do not include explanations or justifications in the output. Do not include text such as 'δεν παρέχει πληροφορίες για τη διεύθυνση'.`,
    `Always start by specifying the document's date in the history segment, if available. For example: "Στις 2020-01-01, το έγγραφο αναφέρει..."`,
    `If, for a specific document, no meaningful history segment can be inferred even with the context of others, provide a brief statement in Greek for its "historySegment" indicating this (e.g., "Δεν εντοπίστηκαν συγκεκριμένες ιστορικές πληροφορίες για αυτό το έγγραφο στο παρόν σύνολο δεδομένων.").`,
    `\nCollected Metadata (Array of objects, each with 'sourceFile' and 'metadata', sorted by document_date where available):\n${JSON.stringify(
      allExtractedMetadata,
      null,
      2
    )}`,
    `\nStrictly follow the provided JSON schema for your response.`,
  ];
  const historyPrompt = historyPromptParts.join("\n");

  const generationConfigForHistory = {
    responseMimeType: "application/json",
    responseSchema: DocumentHistoriesSchema,
  };

  let aggregatedHistoryTextResponse;

  try {
    // Call Gemini API to generate contextual history segments
    aggregatedHistoryTextResponse = await callGeminiWithRetry(
      historyModelInstance,
      historyPrompt,
      `aggregated history for GEMI_ID ${userInputGemiId}`,
      generationConfigForHistory
    );

    try {
      const historyJsonContent = JSON.parse(aggregatedHistoryTextResponse);

      // Validate the structure of Gemini's response
      if (
        historyJsonContent.documentHistories &&
        Array.isArray(historyJsonContent.documentHistories)
      ) {
        if (
          historyJsonContent.documentHistories.length !==
          allExtractedMetadata.length
        ) {
          console.warn(
            `Warning: The number of history segments (${historyJsonContent.documentHistories.length}) does not match input documents (${allExtractedMetadata.length}). This might indicate an issue with the LLM's adherence to the prompt.`
          );
        }
        const historyJsonFilePath = path.join(
          outputFolder,
          `${userInputGemiId}_contextual_document_histories.json`
        );
        // Save the generated history segments to a JSON file
        await fs.writeFile(
          historyJsonFilePath,
          JSON.stringify(historyJsonContent, null, 4),
          "utf-8"
        );
        console.log(
          `Contextual document histories written to ${historyJsonFilePath}`
        );
      } else {
        console.error(
          "Error: The 'documentHistories' field is missing or not an array in the Gemini response for aggregated history."
        );
        console.error(
          "Raw response:",
          aggregatedHistoryTextResponse.substring(0, 500) +
            (aggregatedHistoryTextResponse.length > 500 ? "..." : "")
        );
      }
    } catch (historyJsonParseError) {
      console.error(
        "Error parsing JSON response for contextual document histories:",
        historyJsonParseError
      );
      console.error(
        "Raw response from Gemini:",
        aggregatedHistoryTextResponse.substring(0, 500) +
          (aggregatedHistoryTextResponse.length > 500 ? "..." : "")
      );
    }
  } catch (historyGenError) {
    console.error(
      `Failed to generate contextual document histories for GEMI_ID ${userInputGemiId}.`
    );
    // Provide more specific error messages based on the error type
    if (historyGenError.isRateLimitExhaustion) {
      console.error(
        "This was due to persistent rate limiting after multiple retries."
      );
    } else if (historyGenError.message?.includes("SAFETY")) {
      console.error(
        "Safety settings might have blocked the response. Check the prompt and content. Full error:",
        historyGenError.message
      );
    } else if (
      historyGenError.message?.includes("token") ||
      historyGenError.message?.includes("size") ||
      historyGenError.message?.includes("length")
    ) {
      console.error(
        "The history prompt might be too long or the response too large. Error:",
        historyGenError.message
      );
    } else {
      console.error(
        "An unexpected error occurred during history generation:",
        historyGenError.message
      );
    }
  }
}
