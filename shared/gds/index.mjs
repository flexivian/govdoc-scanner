import fs from "fs/promises";
import { createLogger } from "../logging/index.mjs";
import { FileProcessingError, ValidationError } from "../errors/index.mjs";

const logger = createLogger("GDS");

/**
 * Read and parse a .gds file (JSON format containing array of GEMI IDs)
 * @param {string} filePath - Path to the .gds file
 * @returns {Promise<string[]>} Array of GEMI IDs as strings
 */
export async function readGdsFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);

    // Extract GEMI IDs from the input format
    let gemiIds = [];
    if (Array.isArray(data)) {
      // If it's an array of IDs
      gemiIds = data.filter((id) => /^\d+$/.test(String(id)));
    } else if (data.companies && Array.isArray(data.companies)) {
      // If it's an object with companies array
      gemiIds = data.companies
        .map((company) => company.id || company.gemi_id || company["gemi-id"])
        .filter((id) => id && /^\d+$/.test(String(id)));
    } else if (data.gemi_ids && Array.isArray(data.gemi_ids)) {
      // If it has gemi_ids field
      gemiIds = data.gemi_ids.filter((id) => /^\d+$/.test(String(id)));
    }

    if (gemiIds.length === 0) {
      throw new ValidationError(
        "No valid GEMI IDs found in GDS file",
        "gemi_ids"
      );
    }

    logger.info(`Loaded ${gemiIds.length} GEMI IDs from ${filePath}`);
    return gemiIds.map(String);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new FileProcessingError(
        `GDS file not found: ${filePath}`,
        filePath
      );
    }
    if (error instanceof ValidationError) {
      throw error; // Re-throw validation errors as-is
    }
    throw new FileProcessingError(
      `Error reading GDS file: ${error.message}`,
      filePath
    );
  }
}

/**
 * Write GEMI IDs to a .gds file in JSON array format
 * @param {string[]} gemiIds - Array of GEMI IDs as strings
 * @param {string} filePath - Path where to write the .gds file
 * @returns {Promise<void>}
 */
export async function writeGdsFile(gemiIds, filePath) {
  try {
    // Validate GEMI IDs
    const validIds = gemiIds.filter((id) => /^\d+$/.test(String(id)));

    if (validIds.length === 0) {
      throw new ValidationError(
        "No valid GEMI IDs provided to write",
        "gemi_ids"
      );
    }

    // Write as JSON array
    const content = JSON.stringify(validIds, null, 2);
    await fs.writeFile(filePath, content, "utf-8");

    logger.info(`Wrote ${validIds.length} GEMI IDs to ${filePath}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error; // Re-throw validation errors as-is
    }
    throw new FileProcessingError(
      `Error writing GDS file: ${error.message}`,
      filePath
    );
  }
}

/**
 * Check if a file is a valid .gds file by attempting to parse it
 * @param {string} filePath - Path to the file to validate
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
export async function isValidGdsFile(filePath) {
  try {
    await readGdsFile(filePath);
    return true;
  } catch (error) {
    return false;
  }
}
