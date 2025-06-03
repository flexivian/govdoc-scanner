import fs from "fs";
import path from "path";
import pLimit from "p-limit";
import readline from "readline";

import { getMetadataModel, getHistoryModel } from "./gemini-config.mjs";
import {
  processSingleFile,
  generateContextualHistories,
} from "./processing-logic.mjs";

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
  const outputFolder = path.resolve("./data", gemiId);
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const sourceFolder = path.resolve("./data_src", gemiId);
  if (!fs.existsSync(sourceFolder)) {
    throw new Error(`Source folder ${sourceFolder} does not exist.`);
  }

  return { sourceFolder, outputFolder };
}

// Get all PDF and DOCX files from the source folder
function getFilesToProcess(sourceFolder) {
  const files = fs
    .readdirSync(sourceFolder)
    .filter((file) => file.endsWith(".pdf") || file.endsWith(".docx"));

  if (files.length === 0) {
    throw new Error(`No PDF or DOCX files found in ${sourceFolder}.`);
  }

  return files;
}

// Process files concurrently with a limit
async function processFiles(
  files,
  sourceFolder,
  outputFolder,
  metadataModel,
  concurrency_limit
) {
  const limit = pLimit(concurrency_limit);
  const promises = files.map((file) =>
    limit(() =>
      processSingleFile(
        path.join(sourceFolder, file),
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
    const { sourceFolder, outputFolder } = prepareFolders(gemiId);
    const files = getFilesToProcess(sourceFolder);

    console.log(`Starting parallel processing for ${files.length} files...`);

    const metadataModel = getMetadataModel();
    const results = await processFiles(
      files,
      sourceFolder,
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
