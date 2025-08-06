import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

import { getMetadataModel } from "./gemini-config.mjs";
import { processCompanyFiles } from "./processing-logic.mjs";
import { exit } from "process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    console.log(`Found ${files.length} files to process...`);

    const metadataModel = getMetadataModel();
    const result = await processCompanyFiles(
      files,
      inputFolder,
      outputFolder,
      gemiId,
      metadataModel
    );

    if (result.status === "success") {
      console.log(`\nProcessing completed successfully!`);
      console.log(`Processed ${result.processedFiles} files`);
      console.log(`Final metadata saved to: ${result.metadataPath}`);
    } else {
      console.error(`\n✗ Processing failed: ${result.error}`);
    }
  } catch (err) {
    console.error("Error in main execution:", err.message);
    if (err.stack) console.error(err.stack);
  } finally {
    rl.close();
  }
}

main();
