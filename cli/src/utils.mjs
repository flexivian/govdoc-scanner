import fs from "fs/promises";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load and parse .gds input file (JSON format)
 */
export async function loadInputFile(filePath) {
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
      throw new Error("No valid GEMI IDs found in input file");
    }

    return gemiIds.map(String);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Input file not found: ${filePath}`);
    }
    throw new Error(`Error reading input file: ${error.message}`);
  }
}

/**
 * Write consolidated output to JSON file
 */
export async function writeOutput(companies, outputPath) {
  const output = {
    companies: companies,
  };

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nOutput written to: ${outputPath}`);
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
    const child = spawn("node", [scriptPath, ...args], {
      stdio: "pipe",
      cwd: path.dirname(scriptPath),
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    child.on("error", (error) => {
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

    // Read the results from ids.txt in the crawler directory
    const idsFilePath = path.join(__dirname, "../../apps/crawler/src/ids.txt");

    try {
      const content = await fs.readFile(idsFilePath, "utf-8");
      const gemiIds = content
        .split("\n")
        .map((id) => id.trim())
        .filter((id) => id && /^\d+$/.test(id));

      // If we have more results than requested, randomly select the requested count
      if (gemiIds.length > count) {
        const shuffled = gemiIds.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
      }

      return gemiIds;
    } catch (readError) {
      console.warn(
        `Warning: Could not read results file: ${readError.message}`
      );
      return [];
    }
  } catch (error) {
    console.error(`Error running search script: ${error.message}`);
    return [];
  }
}
