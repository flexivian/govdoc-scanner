import fs from "fs/promises";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { createLogger } from "../../../shared/logging/index.mjs";
import { readGdsFile } from "../../../shared/gds/index.mjs";
import { getWorkingPath } from "../../../shared/workdir/index.mjs";
import {
  FileProcessingError,
  ValidationError,
} from "../../../shared/errors/index.mjs";

const logger = createLogger("CLI-UTILS");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load and parse .gds input file (JSON format)
 */
export async function loadInputFile(filePath) {
  return await readGdsFile(filePath);
}

/**
 * Write consolidated output to JSON file
 */
export async function writeOutput(companies, outputPath) {
  const output = {
    companies: companies,
  };

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8");
  logger.info(`Output written to: ${outputPath}`);
}

/**
 * Generate a random date between two dates
 */
function getRandomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

/**
 * Format date to DD-MM-YYYY format
 */
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Run a script and return a promise
 */
function runScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    let stdout = "";
    const child = spawn("node", [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: path.dirname(scriptPath),
      env: process.env,
    });

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ code, stdout, stderr });
      } else {
        // Attempt to parse structured error marker
        const markerIndex = stderr.lastIndexOf("__SEARCH_ERROR__");
        if (markerIndex !== -1) {
          const jsonPart = stderr.substring(markerIndex + 16).trim();
          try {
            const parsed = JSON.parse(jsonPart);
            const err = new Error(parsed.message || "Search script failed");
            err.code = parsed.code || "search-error";
            return reject(err);
          } catch (_) {
            // fall through
          }
        }
        const err = new Error(
          `Search script exited with code ${code}: ${stderr || stdout}`
        );
        err.code = "search-error";
        reject(err);
      }
    });

    child.on("error", (error) => {
      error.code = error.code || "search-error";
      reject(error);
    });
  });
}

/**
 * Get random company GEMI IDs
 */
export async function getRandomCompanies(count) {
  // Generate random date range from 2000 to yesterday
  const startEpoch = new Date("2000-01-01");
  const today = new Date();

  // Generate a random start date between 2000 and yesterday
  const maxStartDate = new Date(today.getTime() - 24 * 60 * 60 * 1000); // yesterday
  const randomStartDate = getRandomDate(startEpoch, maxStartDate);

  // End date is one day after start date
  const randomEndDate = new Date(
    randomStartDate.getTime() + 24 * 60 * 60 * 1000
  );

  const incorporationStart = formatDate(randomStartDate);
  const incorporationFinish = formatDate(randomEndDate);

  // Path to the search script in the crawler app
  const searchScriptPath = path.join(
    __dirname,
    "../../apps/crawler/src/search.mjs"
  );

  const scriptArgs = [
    "--term",
    "a",
    "--filter.incorporation_start",
    incorporationStart,
    "--filter.incorporation_finish",
    incorporationFinish,
  ];

  try {
    await runScript(searchScriptPath, scriptArgs);

    // Read the results from search-results.gds in the crawler working directory
    const gdsFilePath = getWorkingPath('crawler', 'search-results.gds');

    try {
      const gemiIds = await readGdsFile(gdsFilePath);

      // If we have more results than requested, randomly select the requested count
      if (gemiIds.length > count) {
        const shuffled = gemiIds.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
      }

      return gemiIds;
    } catch (readError) {
      logger.warn(`Warning: Could not read results file: ${readError.message}`);
      return [];
    }
  } catch (error) {
    logger.error(`Error running search script: ${error.message}`);
    // Re-throw with code so caller can differentiate
    throw error;
  }
}
