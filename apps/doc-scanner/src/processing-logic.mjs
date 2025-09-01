import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";

import { CompanyEssentialMetadata } from "./metadata.mjs";
import { callGeminiWithRetry } from "./gemini-config.mjs";
import {
  getInitialExtractionPrompt,
  getMergeMetadataPrompt,
} from "./prompts.mjs";
import { createLogger } from "../../../shared/logging/index.mjs";

const logger = createLogger("DOC-SCANNER-PROCESSING");

const MIME_TYPE_TEXT_PLAIN = "text/plain";
const MIME_TYPE_PDF = "application/pdf";

// Lenient JSON parsing to handle occasional markdown-fenced responses from the model
export function parseGeminiJson(raw, fileName = "") {
  if (raw == null) throw new Error("Empty response from model");
  const text = String(raw).trim();
  try {
    return JSON.parse(text);
  } catch (_) {
    // Try stripping markdown code fences like ```json ... ```
    let stripped = text
      .replace(/^\s*```(?:json|JSON)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();
    try {
      return JSON.parse(stripped);
    } catch (_) {
      // As a last resort, extract the largest {...} block
      const start = stripped.indexOf("{");
      const end = stripped.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const candidate = stripped.slice(start, end + 1);
        try {
          return JSON.parse(candidate);
        } catch (err3) {
          throw new Error(
            `Failed to parse JSON for ${fileName || "response"}: ${err3.message}`
          );
        }
      }
      throw new Error(
        `Failed to parse JSON for ${fileName || "response"}: Unexpected content`
      );
    }
  }
}

function extractDateFromFilename(fileName) {
  const dateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
  return dateMatch ? dateMatch[1] : null;
}

function sortFilesByDate(files) {
  return files.slice().sort((a, b) => {
    const dateA = extractDateFromFilename(a);
    const dateB = extractDateFromFilename(b);

    if (dateA && dateB) {
      return new Date(dateA) - new Date(dateB);
    }
    if (dateA) return -1;
    if (dateB) return 1;
    return 0;
  });
}

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

// Extract metadata from the first document
async function extractInitialMetadata(filePart, fileName, modelInstance) {
  const extractedDate = extractDateFromFilename(fileName);
  const prompt = getInitialExtractionPrompt(extractedDate);

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
  return parseGeminiJson(response, fileName);
}

// Merge new document with existing metadata
async function mergeMetadataWithGemini(
  filePart,
  fileName,
  existingMetadata,
  modelInstance
) {
  const extractedDate = extractDateFromFilename(fileName);
  const prompt = getMergeMetadataPrompt(extractedDate, existingMetadata);

  const config = {
    responseMimeType: "application/json",
    responseSchema: CompanyEssentialMetadata,
  };
  const response = await callGeminiWithRetry(
    modelInstance,
    [prompt, filePart],
    `merge-${fileName}`,
    config
  );
  return parseGeminiJson(response, fileName);
}

// Save JSON file to disk
async function saveJson(data, dir, fileName) {
  await fs.mkdir(dir, { recursive: true });
  const outPath = path.join(dir, fileName);
  await fs.writeFile(outPath, JSON.stringify(data, null, 2), "utf-8");
  return outPath;
}

// Create the final metadata structure
function createFinalMetadataStructure(
  gemiId,
  companyName,
  companyTaxId,
  creationDate,
  currentSnapshot,
  trackedChangesHistory = {}
) {
  // Extract tracked_company_changes and tracked_economic_changes from current snapshot for both history and current display
  const trackedCompanyChanges = currentSnapshot.tracked_company_changes;
  const trackedEconomicChanges = currentSnapshot.tracked_economic_changes;

  // Keep tracked changes in current snapshot but also store in history
  const finalSnapshot = { ...currentSnapshot };

  return {
    [gemiId]: {
      "company-name": companyName,
      "company-tax-id": companyTaxId,
      "creation-date": creationDate,
      "scan-date": new Date().toISOString(),
      metadata: {
        "current-snapshot": finalSnapshot,
      },
      "tracked-changes": trackedChangesHistory,
    },
  };
}

// Process company files sequentially by date and extract/merge metadata
export async function processCompanyFiles(
  files,
  inputFolder,
  outputFolder,
  gemiId,
  metadataModel
) {
  try {
    // Sort files chronologically
    const sortedFiles = sortFilesByDate(files);
    let cumulativeMetadata = null;
    let companyName = null;
    let companyTaxId = null;
    let creationDate = null; // Track creation date from first document
    let trackedChangesHistory = {}; // Store tracked changes by document name

    // Check if final metadata file already exists to load existing data
    const finalMetadataPath = path.join(
      outputFolder,
      `${gemiId}_final_metadata.json`
    );

    let existingFinalMetadata = null;
    let hasExistingMetadata = false;

    try {
      const existingFinalMetadataContent = await fs.readFile(
        finalMetadataPath,
        "utf-8"
      );
      existingFinalMetadata = JSON.parse(existingFinalMetadataContent);
      hasExistingMetadata = true;

      if (existingFinalMetadata[gemiId]) {
        const existingData = existingFinalMetadata[gemiId];

        // Load existing metadata
        if (
          existingData.metadata &&
          existingData.metadata["current-snapshot"]
        ) {
          cumulativeMetadata = existingData.metadata["current-snapshot"];
          companyName = existingData["company-name"];
          companyTaxId = existingData["company-tax-id"];
          creationDate = existingData["creation-date"];
        }

        // Load existing tracked changes
        if (existingData["tracked-changes"]) {
          trackedChangesHistory = existingData["tracked-changes"];
        }
      }

      logger.debug("Loaded existing metadata, processing new files only");
    } catch (err) {
      // File doesn't exist or is invalid, start fresh
      logger.debug("No existing final metadata found, starting fresh");
      hasExistingMetadata = false;
    }

    // If we have existing metadata but no files to process, something went wrong
    if (hasExistingMetadata && sortedFiles.length === 0) {
      return {
        status: "success",
        metadataPath: finalMetadataPath,
        processedFiles: 0,
        finalMetadata: existingFinalMetadata,
      };
    }

    // Iterate through each file
    for (let i = 0; i < sortedFiles.length; i++) {
      const fileName = sortedFiles[i];
      try {
        logger.info(`Processing: ${fileName} (${i + 1}/${sortedFiles.length})`);
        const filePath = path.join(inputFolder, fileName);

        // Prepare file data for Gemini
        const { data, mimeType } = await prepareFileData(filePath, fileName);
        const filePart = { inlineData: { data, mimeType } };

        let geminiStartTime = Date.now();
        let geminiEndTime;

        if (!hasExistingMetadata && i === 0) {
          // Extract initial metadata from the first document (only if no existing metadata)
          cumulativeMetadata = await extractInitialMetadata(
            filePart,
            fileName,
            metadataModel
          );
          geminiEndTime = Date.now();

          const extractedDate = extractDateFromFilename(fileName);
          if (extractedDate) {
            cumulativeMetadata.document_date = extractedDate;
            creationDate = extractedDate; // Set creation date from first document
          }

          companyName = cumulativeMetadata.company_name;
          companyTaxId = cumulativeMetadata.company_tax_id;

          // For the first file, record it as the initial company registration
          trackedChangesHistory[fileName] =
            "Initial company registration document";
        } else {
          // Merge new document metadata with existing metadata
          cumulativeMetadata = await mergeMetadataWithGemini(
            filePart,
            fileName,
            cumulativeMetadata,
            metadataModel
          );
          geminiEndTime = Date.now();

          // Store tracked changes if they exist
          if (
            cumulativeMetadata.tracked_company_changes ||
            cumulativeMetadata.tracked_economic_changes
          ) {
            const changes = {};
            if (cumulativeMetadata.tracked_company_changes) {
              changes.company_changes =
                cumulativeMetadata.tracked_company_changes;
            }
            if (cumulativeMetadata.tracked_economic_changes) {
              changes.economic_changes =
                cumulativeMetadata.tracked_economic_changes;
            }
            trackedChangesHistory[fileName] = changes;
          } else {
            // Even if no specific changes, record that the file was processed
            trackedChangesHistory[fileName] = "No significant changes detected";
          }

          companyName = cumulativeMetadata.company_name; // Company name may change
        }

        const geminiTimeMs = geminiEndTime - geminiStartTime;
        logger.info(`Successfully processed: ${fileName} (${geminiTimeMs}ms)`);
      } catch (err) {
        logger.error(`Error processing ${fileName}`, err);
      }
    }

    // Save final metadata to disk
    if (cumulativeMetadata && gemiId) {
      const finalMetadata = createFinalMetadataStructure(
        gemiId,
        companyName || cumulativeMetadata.company_name,
        companyTaxId || cumulativeMetadata.company_tax_id,
        creationDate,
        cumulativeMetadata,
        trackedChangesHistory
      );

      await saveJson(
        finalMetadata,
        outputFolder,
        `${gemiId}_final_metadata.json`
      );

      return {
        status: "success",
        metadataPath: finalMetadataPath,
        processedFiles: sortedFiles.length,
        finalMetadata,
      };
    } else {
      throw new Error(
        "No valid metadata could be extracted from any documents"
      );
    }
  } catch (err) {
    logger.error("Error in processCompanyFiles", err);
    return {
      status: "error",
      error: err.message,
      processedFiles: 0,
    };
  }
}
