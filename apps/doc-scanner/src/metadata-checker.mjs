import fs from "fs";
import path from "path";
import { createLogger } from "../../../shared/logging/index.mjs";

const logger = createLogger("METADATA-CHECKER");

// Check if metadata already exists and determine if we need to process
export function checkExistingMetadata(gemiId, outputFolder, inputFiles) {
  const metadataPath = path.resolve(
    outputFolder,
    `${gemiId}_final_metadata.json`
  );

  if (!fs.existsSync(metadataPath)) {
    return {
      shouldProcess: true,
      filesToProcess: inputFiles,
      reason: "No existing metadata found",
    };
  }

  try {
    const metadataContent = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(metadataContent);

    if (!metadata[gemiId] || !metadata[gemiId]["tracked-changes"]) {
      return {
        shouldProcess: true,
        filesToProcess: inputFiles,
        reason: "Existing metadata has no tracked changes",
      };
    }

    const trackedChanges = metadata[gemiId]["tracked-changes"];
    const trackedFiles = Object.keys(trackedChanges);

    if (trackedFiles.length === 0) {
      return {
        shouldProcess: true,
        filesToProcess: inputFiles,
        reason: "No tracked files found in existing metadata",
      };
    }

    // Sort input files by date and get the latest
    const sortedInputFiles = inputFiles.slice().sort((a, b) => {
      const dateA = a.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
      const dateB = b.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
      if (dateA && dateB) {
        return new Date(dateB) - new Date(dateA); // Descending order
      }
      return 0;
    });

    const latestInputFile = sortedInputFiles[0];

    // Sort tracked files by date and get the latest
    const sortedTrackedFiles = trackedFiles.slice().sort((a, b) => {
      const dateA = a.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
      const dateB = b.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
      if (dateA && dateB) {
        return new Date(dateB) - new Date(dateA); // Descending order
      }
      return 0;
    });

    const latestTrackedFile = sortedTrackedFiles[0];

    if (latestInputFile === latestTrackedFile) {
      return {
        shouldProcess: false,
        filesToProcess: [],
        reason: `Latest tracked file (${latestTrackedFile}) matches latest input file (${latestInputFile})`,
      };
    }

    // Find new files that haven't been processed yet
    const newFiles = inputFiles.filter((file) => !trackedFiles.includes(file));

    if (newFiles.length === 0) {
      return {
        shouldProcess: false,
        filesToProcess: [],
        reason: "All input files have already been processed",
      };
    }

    return {
      shouldProcess: true,
      filesToProcess: newFiles,
      reason: `Found ${newFiles.length} new file(s) to process: ${newFiles.join(", ")}`,
    };
  } catch (error) {
    logger.warn(`Error reading existing metadata: ${error.message}`);
    return {
      shouldProcess: true,
      filesToProcess: inputFiles,
      reason: "Error reading existing metadata, starting fresh",
    };
  }
}
