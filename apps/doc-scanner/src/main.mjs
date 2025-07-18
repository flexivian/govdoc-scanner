import fs from "fs";
import path from "path";
import pLimit from "p-limit";
import readline from "readline";
import { fileURLToPath } from "url";

import { getMetadataModel, getHistoryModel } from "./gemini-config.mjs";
import {
  processSingleFile,
  generateContextualHistories,
} from "./processing-logic.mjs";
import { exit } from "process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GEMINI_CONCURRENCY_LIMIT = 15; // Gemini Flash lite has a limit of 30, using 15 to be safe.

// Prompt user for GEMI_ID
async function promptForGemiId(rl) {
  return new Promise((resolve) => {
    rl.question(
      "Enter the GEMI_ID (this will be used as a batch/folder identifier): ",
      resolve
    );
  });
}

// Validate and prepare input/output folders
function prepareFolders(gemiId) {
  const inputFolder = path.resolve(__dirname, "data/input", gemiId);
  if (!fs.existsSync(inputFolder)) {
    console.log(
      `Input folder ${inputFolder} does not exist. Please ensure the folder is created and contains the files to process.`
    );
    exit(1);
  }

  const outputFolder = path.resolve(__dirname, "data/output", gemiId);
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  return { inputFolder, outputFolder };
}

// Get all PDF and DOCX files from the source folder
function getFilesToProcess(inputFolder) {
  const files = fs
    .readdirSync(inputFolder)
    .filter(
      (file) =>
        file.endsWith(".pdf") || file.endsWith(".docx") || file.endsWith(".doc")
    );

  if (files.length === 0) {
    throw new Error(`No documents found in ${inputFolder}.`);
  }

  return files;
}

// Process files concurrently with a limit
async function processFiles(
  files,
  inputFolder,
  outputFolder,
  metadataModel,
  concurrency_limit
) {
  const limit = pLimit(concurrency_limit);
  const promises = files.map((file) =>
    limit(() =>
      processSingleFile(
        path.join(inputFolder, file),
        outputFolder,
        file,
        metadataModel
      )
    )
  );
  return await Promise.allSettled(promises);
}

// Handle processing results and collect extracted metadata
function handleProcessingResults(results, files) {
  const allExtractedMetadata = [];

  results.forEach((result, index) => {
    const originalFile = files[index];
    if (result.status === "fulfilled") {
      const fileResult = result.value;
      if (fileResult) {
        if (fileResult.status === "success" && fileResult.data) {
          allExtractedMetadata.push(fileResult.data);
        } else if (fileResult.status === "error") {
          console.warn(
            `File processing failed for ${fileResult.file || originalFile}: ${
              fileResult.reason
            }. Error: ${fileResult.error?.message || fileResult.error}`
          );
          if (fileResult.rawResponse) {
            console.warn(
              `Raw response for ${
                fileResult.file || originalFile
              } was: ${fileResult.rawResponse.substring(0, 200)}...`
            );
          }
        } else if (fileResult.status === "skipped") {
          console.log(
            `File processing skipped for ${fileResult.file || originalFile}: ${
              fileResult.reason
            }`
          );
        } else {
          console.warn(
            `Unexpected fulfilled result status for ${originalFile}: '${fileResult.status}'. Full result:`,
            fileResult
          );
        }
      } else {
        console.warn(
          `Fulfilled promise for ${originalFile} returned null or undefined result.`
        );
      }
    } else if (result.status === "rejected") {
      console.error(
        `A file processing task for ${originalFile} was critically rejected:`,
        result.reason
      );
    }
  });

  return allExtractedMetadata;
}

// Generate contextual histories if metadata exists
async function generateHistoriesIfAny(metadata, outputFolder, gemiId) {
  if (metadata.length > 0) {
    const historyModel = getHistoryModel();
    await generateContextualHistories(
      metadata,
      outputFolder,
      gemiId,
      historyModel
    );
  } else {
    console.log(
      "\nNo metadata was successfully extracted, skipping contextual document history generation."
    );
  }
}

// Main execution
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const gemiId = await promptForGemiId(rl);
    const { inputFolder, outputFolder } = prepareFolders(gemiId);
    const files = getFilesToProcess(inputFolder);

    console.log(`Starting parallel processing for ${files.length} files...`);

    const metadataModel = getMetadataModel();
    const results = await processFiles(
      files,
      inputFolder,
      outputFolder,
      metadataModel,
      GEMINI_CONCURRENCY_LIMIT
    );
    const metadata = handleProcessingResults(results, files);

    await generateHistoriesIfAny(metadata, outputFolder, gemiId);

    console.log("\nProcessing complete.");
  } catch (err) {
    console.error("Error in main execution:", err.message);
    if (err.stack) console.error(err.stack);
  } finally {
    rl.close();
  }
}

main();
