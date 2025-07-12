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

const MIME_TYPE_TEXT_PLAIN = "text/plain";
const MIME_TYPE_PDF = "application/pdf";

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
  return JSON.parse(response);
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
  return JSON.parse(response);
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
  currentSnapshot
) {
  return {
    [gemiId]: {
      "company-name": companyName,
      "company-tax-id": companyTaxId,
      "creation-date": creationDate,
      "scan-date": new Date().toISOString(),
      metadata: {
        "current-snapshot": currentSnapshot,
      },
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
    console.log(
      `Processing ${sortedFiles.length} files in chronological order...`
    );

    let cumulativeMetadata = null;
    let companyName = null;
    let companyTaxId = null;
    let creationDate = null; // Track creation date from first document

    // Iterate through each file
    for (let i = 0; i < sortedFiles.length; i++) {
      const fileName = sortedFiles[i];
      try {
        console.log(`Processing: ${fileName} (${i + 1}/${sortedFiles.length})`);
        const filePath = path.join(inputFolder, fileName);

        // Prepare file data for Gemini
        const { data, mimeType } = await prepareFileData(filePath, fileName);
        const filePart = { inlineData: { data, mimeType } };

        if (i === 0) {
          // Extract initial metadata from the first document
          cumulativeMetadata = await extractInitialMetadata(
            filePart,
            fileName,
            metadataModel
          );

          const extractedDate = extractDateFromFilename(fileName);
          if (extractedDate) {
            cumulativeMetadata.document_date = extractedDate;
            creationDate = extractedDate; // Set creation date from first document
          }

          companyName = cumulativeMetadata.company_name;
          companyTaxId = cumulativeMetadata.company_tax_id;
        } else {
          // Merge new document metadata with existing metadata
          cumulativeMetadata = await mergeMetadataWithGemini(
            filePart,
            fileName,
            cumulativeMetadata,
            metadataModel
          );

          if (cumulativeMetadata.company_name && !companyName) {
            companyName = cumulativeMetadata.company_name;
          }
          if (cumulativeMetadata.company_tax_id && !companyTaxId) {
            companyTaxId = cumulativeMetadata.company_tax_id;
          }
        }

        console.log(`Successfully processed: ${fileName}`);
      } catch (err) {
        console.error(`Error processing ${fileName}:`, err.message);
      }
    }

    // Save final metadata to disk
    if (cumulativeMetadata && gemiId) {
      const finalMetadata = createFinalMetadataStructure(
        gemiId,
        companyName || cumulativeMetadata.company_name,
        companyTaxId || cumulativeMetadata.company_tax_id,
        creationDate,
        cumulativeMetadata
      );

      const finalMetadataPath = path.join(
        outputFolder,
        `${gemiId}_final_metadata.json`
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
    console.error("Error in processCompanyFiles:", err);
    return {
      status: "error",
      error: err.message,
      processedFiles: 0,
    };
  }
}
