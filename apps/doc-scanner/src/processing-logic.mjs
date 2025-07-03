import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";

import {
  CompanyEssentialMetadata,
  DocumentHistoriesSchema,
} from "./metadata.mjs";
import { callGeminiWithRetry } from "./gemini-config.mjs";

const MIME_TYPE_TEXT_PLAIN = "text/plain";
const MIME_TYPE_PDF = "application/pdf";

// === Single file processing ===

// Read any file as base64
async function readFileAsBase64(filePath) {
  const buffer = await fs.readFile(filePath);
  return buffer.toString("base64");
}

// Convert DOCX to plain-text base64
async function convertDocxToBase64(filePath) {
  const buffer = await fs.readFile(filePath);
  const { value: text } = await mammoth.extractRawText({ buffer });
  return Buffer.from(text, "utf-8").toString("base64");
}

// Convert DOC (binary) to plain-text base64 using word-extractor
async function convertDocToBase64(filePath) {
  const extractor = new WordExtractor();
  const doc = await extractor.extract(filePath);
  const text = doc.getBody();
  return Buffer.from(text, "utf-8").toString("base64");
}

// Prepare file data (base64 + mimeType)
async function prepareFileData(filePath, fileName) {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === ".doc") {
    const data = await convertDocToBase64(filePath);
    return { data, mimeType: MIME_TYPE_TEXT_PLAIN };
  }

  if (ext === ".docx") {
    const data = await convertDocxToBase64(filePath);
    return { data, mimeType: MIME_TYPE_TEXT_PLAIN };
  }

  if (ext === ".pdf") {
    const data = await readFileAsBase64(filePath);
    return { data, mimeType: MIME_TYPE_PDF };
  }

  throw new Error("unsupported_type");
}

// Call Gemini to extract metadata JSON
async function extractMetadata(filePart, fileName, modelInstance) {
  const prompt = `Analyze the attached document and extract essential company metadata.
  Strictly follow the provided JSON schema. For fields where information is not found or you are not 100% certain, use null.
  Ensure results are in Greek. Make sure to use only the choices from the enums where applicable.`;

  const config = {
    responseMimeType: "application/json",
    responseSchema: CompanyEssentialMetadata,
  };
  const response = await callGeminiWithRetry(
    modelInstance,
    [prompt, filePart],
    fileName,
    config
  );
  return JSON.parse(response);
}

// Save JSON file
async function saveJson(data, dir, fileName) {
  await fs.mkdir(dir, { recursive: true });
  const outPath = path.join(dir, fileName);
  await fs.writeFile(outPath, JSON.stringify(data, null, 2), "utf-8");
  return outPath;
}

export async function processSingleFile(
  filePath,
  outputFolder,
  fileName,
  metadataModel
) {
  try {
    const { data, mimeType } = await prepareFileData(filePath, fileName);
    const filePart = { inlineData: { data, mimeType } };

    const metadataJson = await extractMetadata(
      filePart,
      fileName,
      metadataModel
    );

    const metadataDir = path.join(outputFolder, "document_metadata");
    const jsonName = fileName.replace(/\.(pdf|docx|doc)$/, ".json");
    const savedPath = await saveJson(metadataJson, metadataDir, jsonName);

    return {
      status: "success",
      file: fileName,
      data: { sourceFile: fileName, metadata: metadataJson },
    };
  } catch (err) {
    console.error(`Error with ${fileName}:`, err);
    const reason =
      err.message === "unsupported_type"
        ? "unsupported_type"
        : "processing_error";
    return { status: "error", file: fileName, reason, error: err };
  }
}

// === Contextual history ===

function sortByDate(metadataList) {
  return metadataList.slice().sort((a, b) => {
    const da = a.metadata?.document_date
      ? new Date(a.metadata.document_date)
      : null;
    const db = b.metadata?.document_date
      ? new Date(b.metadata.document_date)
      : null;
    if (da && db) return da - db;
    if (da) return -1;
    if (db) return 1;
    return 0;
  });
}

function buildHistoryPrompt(sortedMetadata, gemiId) {
  const historyPromptParts = [
    `You are provided with a collection of metadata extracted from multiple documents related to a company (or entities under the GEMI_ID: ${gemiId}). The collection is sorted by the document's date, where available, from oldest to newest.`,
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
      sortedMetadata,
      null,
      2
    )}`,
    `\nStrictly follow the provided JSON schema for your response.`,
  ];
  return historyPromptParts.join("\n");
}

export async function generateContextualHistories(
  metadataList,
  outputFolder,
  gemiId,
  historyModel
) {
  console.log(
    `Generating histories for ${metadataList.length} docs (GEMI_ID: ${gemiId})`
  );
  const sorted = sortByDate(metadataList);
  const prompt = buildHistoryPrompt(sorted, gemiId);
  const config = {
    responseMimeType: "application/json",
    responseSchema: DocumentHistoriesSchema,
  };

  try {
    const raw = await callGeminiWithRetry(
      historyModel,
      prompt,
      `history-${gemiId}`,
      config
    );
    const json = JSON.parse(raw);
    if (Array.isArray(json.documentHistories)) {
      const outPath = path.join(
        outputFolder,
        `${gemiId}_contextual_document_histories.json`
      );
      await saveJson(
        json,
        outputFolder,
        `${gemiId}_contextual_document_histories.json`
      );
      console.log(`Histories saved: ${outPath}`);
    } else {
      console.error("Invalid response format", json);
    }
  } catch (err) {
    console.error("History generation failed:", err);
  }
}
