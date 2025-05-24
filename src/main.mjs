import fs from "fs";
import path from "path";
import pLimit from "p-limit";
import readline from "readline";

import { getMetadataModel, getHistoryModel } from "./gemini-config.mjs";

import {
  processSingleFile,
  generateContextualHistories,
} from "./processing-logic.mjs";

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let userInputGemiId;
  try {
    userInputGemiId = await new Promise((resolve) => {
      rl.question(
        "Enter the GEMI_ID (this will be used as a batch/folder identifier): ",
        resolve
      );
    });

    const outputFolder = path.resolve("../data", userInputGemiId);
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const sourceFolder = path.resolve("../data_src", userInputGemiId);
    if (!fs.existsSync(sourceFolder)) {
      throw new Error(`Source folder ${sourceFolder} does not exist.`);
    }

    const files = fs
      .readdirSync(sourceFolder)
      .filter((file) => file.endsWith(".pdf") || file.endsWith(".docx"));

    if (files.length === 0) {
      throw new Error(`No PDF or DOCX files found in ${sourceFolder}.`);
    }

    const allExtractedMetadata = [];

    // Gemini Flash lite has a concurrency limit of 30.
    // However, we are setting it to 10 to avoid overwhelming the API.
    const geminiConcurrencyLimit = 15;

    const limit = pLimit(geminiConcurrencyLimit);

    console.log(
      `Starting parallel processing for ${files.length} files with concurrency ${geminiConcurrencyLimit}...`
    );

    const metadataModel = getMetadataModel();

    // Process each file in parallel with a concurrency limit
    const processingPromises = files.map((file) =>
      limit(() =>
        processSingleFile(
          path.join(sourceFolder, file),
          outputFolder,
          file,
          metadataModel
        )
      )
    );

    const results = await Promise.allSettled(processingPromises);
    // Log the results
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
              `File processing skipped for ${
                fileResult.file || originalFile
              }: ${fileResult.reason}`
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

    if (allExtractedMetadata.length > 0) {
      // Generate contextual document histories
      const historyModel = getHistoryModel();
      await generateContextualHistories(
        allExtractedMetadata,
        outputFolder,
        userInputGemiId,
        historyModel
      );
    } else {
      console.log(
        "\nNo metadata was successfully extracted, skipping contextual document history generation."
      );
    }

    console.log("\nProcessing complete.");
  } catch (error) {
    console.error("Error in main execution:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    rl.close();
  }
}

main();
