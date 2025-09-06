import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

import { getMetadataModel } from "./gemini-config.mjs";
import { validateApiKey } from "../../../shared/config/validator.mjs";
import { processCompanyFiles } from "./processing-logic.mjs";
import { checkExistingMetadata } from "./metadata-checker.mjs";
import { exit } from "process";
import { createLogger } from "../../../shared/logging/index.mjs";
import { initWorkingDir, getWorkingPath } from "../../../shared/workdir/index.mjs";

const logger = createLogger("DOC-SCANNER");

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
async function prepareFolders(gemiId) {
  // Initialize doc-scanner working directory with input and output subdirs
  await initWorkingDir('docScanner', ['input', 'output']);
  
  const inputFolder = getWorkingPath('docScanner', 'input', gemiId);
  if (!fs.existsSync(inputFolder)) {
    logger.error(
      `Input folder ${inputFolder} does not exist. Please ensure the folder is created and contains the files to process.`
    );
    exit(1);
  }

  const outputFolder = getWorkingPath('docScanner', 'output', gemiId);
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
    const online = await validateApiKey();
    if (!online.ok) {
      logger.error(`Invalid API key: ${online.reason}`);
      rl.close();
      exit(1);
    }
    const gemiId = await promptForGemiId(rl);
    const { inputFolder, outputFolder } = await prepareFolders(gemiId);
    const files = getFilesToProcess(inputFolder);

    logger.info(`Found ${files.length} files in input folder...`);

    // Check if we need to process based on existing metadata
    const processCheck = checkExistingMetadata(gemiId, outputFolder, files);
    logger.info(processCheck.reason);

    if (!processCheck.shouldProcess) {
      logger.info("No processing needed. All documents are up to date.");
      return;
    }

    const filesToProcess = processCheck.filesToProcess;
    logger.info(`Processing ${filesToProcess.length} file(s)...`);

    const metadataModel = getMetadataModel();
    const result = await processCompanyFiles(
      filesToProcess,
      inputFolder,
      outputFolder,
      gemiId,
      metadataModel
    );

    if (result.status === "success") {
      logger.info(`Processing completed successfully!`);
      logger.info(`Processed ${result.processedFiles} files`);
      logger.info(`Final metadata saved to: ${result.metadataPath}`);
    } else {
      logger.error(`Processing failed: ${result.error}`);
    }
  } catch (err) {
    logger.error("Error in main execution", err);
  } finally {
    rl.close();
  }
}

main();
