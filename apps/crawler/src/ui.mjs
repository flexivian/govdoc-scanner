import inquirer from "inquirer";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isValidGemiId } from "./utils.mjs";

import { findAndConfirmMatch } from "./filter_correction.mjs";
import {
  legal_types,
  companyStatuses,
  suspension_choices,
  special_types,
  competent_gemi_offices,
  Places,
  economicActivities,
} from "./filter_choices.mjs";

const RESULTS_FILE = "search-results.gds";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Runs a script in a child process and streams its output.
scriptPath - Path to the Node.js script.
args - Arguments to pass to the script.
returns {Promise<void>} - A promise that resolves when the script exits successfully.
*/
function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n> Executing: node ${scriptPath} ${args.join(" ")}\n`);

    // Use 'inherit' to show the script's output in real-time
    const child = spawn("node", [scriptPath, ...args], {
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`\n✅ Script finished successfully.`);
        resolve();
      } else {
        console.error(
          `\n❌ Script ${path.basename(scriptPath)} exited with code ${code}.`
        );
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    child.on("error", (err) => {
      console.error(
        `\n❌ Failed to start script ${path.basename(scriptPath)}.`
      );
      reject(err);
    });
  });
}

// Prompts the user for search criteria and runs the search script.
async function promptForSearch() {
  console.clear();
  console.log("--- Company Search Configuration ---\n");

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "searchTerm",
      message: "Enter the search term (e.g., ΤΡΑΠΕΖΑ):",
    },
    {
      type: "input",
      name: "legal_type",
      message:
        "Filter by Legal Type (e.g., ΑΕ, ΙΚΕ) (optional, press Enter to skip):",
    },
    {
      type: "input",
      name: "status",
      message:
        "Filter by Status (e.g., Ενεργή) (optional, press Enter to skip):",
    },
    {
      type: "input",
      name: "competent_office",
      message:
        "Filter by Competent Office (e.g., ΕΠΙΜΕΛΗΤΗΡΙΟ ΑΡΤΑΣ) (optional, press Enter to skip):",
    },
    {
      type: "input",
      name: "suspension",
      message:
        "Filter by Suspension (e.g., Οχι) (optional, press Enter to skip):",
    },
    {
      type: "input",
      name: "special",
      message:
        "Filter by Special Characteristic (e.g., Εισηγμένες) (optional, press Enter to skip):",
    },
    {
      type: "input",
      name: "activity",
      message:
        "Filter by Activity (e.g., 01.11.2 ΚΑΛΛΙΕΡΓΕΙΑ ΑΡΑΒΟΣΙΤΟΥ) (optional, press Enter to skip):",
    },
    {
      type: "input",
      name: "place",
      message:
        "Filter by Place (e.g., ΑΜΦΙΠΟΛΗΣ) (optional, press Enter to skip):",
    },
    {
      type: "input",
      name: "incorporation_start",
      message:
        "Filter by Incorporation Start Date (dd/mm/yyyy) (optional, press Enter to skip):",
    },
    {
      type: "input",
      name: "incorporation_finish",
      message:
        "Filter by Incorporation Finish Date (dd/mm/yyyy) (optional, press Enter to skip):",
    },
    {
      type: "input",
      name: "closing_start",
      message:
        "Filter by Closing Start Date (dd/mm/yyyy) (optional, press Enter to skip):",
    },
    {
      type: "input",
      name: "closing_finish",
      message:
        "Filter by Closing Finish Date (dd/mm/yyyy) (optional, press Enter to skip):",
    },
    {
      type: "input",
      name: "kak_change_start",
      message:
        "Filter by KAK Change Start Date (dd/mm/yyyy) (optional, press Enter to skip):",
    },
    {
      type: "input",
      name: "kak_change_finish",
      message:
        "Filter by KAK Change Finish Date (dd/mm/yyyy) (optional, press Enter to skip):",
    },
    {
      type: "input",
      name: "city",
      message: "Filter by City (e.g., Αθήνα) (optional, press Enter to skip):",
    },
    {
      type: "input",
      name: "tk",
      message: "Filter by TK (e.g., 10434) (optional, press Enter to skip):",
    },
  ]);

  // Use the imported function to process inputs with fuzzy matching
  const matchedFilters = {
    legal_type: await findAndConfirmMatch(
      answers.legal_type,
      legal_types,
      "Legal Type"
    ),
    status: await findAndConfirmMatch(
      answers.status,
      companyStatuses,
      "Status"
    ),
    competent_office: await findAndConfirmMatch(
      answers.competent_office,
      competent_gemi_offices,
      "Competent Office"
    ),
    suspension: await findAndConfirmMatch(
      answers.suspension,
      suspension_choices,
      "Suspension"
    ),
    special: await findAndConfirmMatch(
      answers.special,
      special_types,
      "Special Characteristic"
    ),
    activity: await findAndConfirmMatch(
      answers.activity,
      economicActivities,
      "Activity"
    ),
    place: await findAndConfirmMatch(answers.place, Places, "Place"),
  };

  const scriptArgs = [];
  if (answers.searchTerm) scriptArgs.push("--term", answers.searchTerm);

  // Use the processed (matched) filter values
  if (matchedFilters.legal_type)
    scriptArgs.push("--filter.legal_type", matchedFilters.legal_type);
  if (matchedFilters.status)
    scriptArgs.push("--filter.status", matchedFilters.status);
  if (matchedFilters.competent_office)
    scriptArgs.push(
      "--filter.competent_office",
      matchedFilters.competent_office
    );
  if (matchedFilters.suspension)
    scriptArgs.push("--filter.suspension", matchedFilters.suspension);
  if (matchedFilters.special)
    scriptArgs.push("--filter.special", matchedFilters.special);
  if (matchedFilters.activity)
    scriptArgs.push("--filter.activity", matchedFilters.activity);
  if (matchedFilters.place)
    scriptArgs.push("--filter.place", matchedFilters.place);

  // These filters don't have predefined lists, so we pass them directly
  if (answers.incorporation_start)
    scriptArgs.push(
      "--filter.incorporation_start",
      answers.incorporation_start
    );
  if (answers.incorporation_finish)
    scriptArgs.push(
      "--filter.incorporation_finish",
      answers.incorporation_finish
    );
  if (answers.closing_start)
    scriptArgs.push("--filter.closing_start", answers.closing_start);
  if (answers.closing_finish)
    scriptArgs.push("--filter.closing_finish", answers.closing_finish);
  if (answers.kak_change_start)
    scriptArgs.push("--filter.kak_change_start", answers.kak_change_start);
  if (answers.kak_change_finish)
    scriptArgs.push("--filter.kak_change_finish", answers.kak_change_finish);
  if (answers.city) scriptArgs.push("--filter.city", answers.city);
  if (answers.tk) scriptArgs.push("--filter.tk", answers.tk);

  try {
    await runScript(path.join(__dirname, "search.mjs"), scriptArgs);
    console.log(`\nResults are saved in the crawler working directory as ${RESULTS_FILE}.`);
  } catch (error) {
    console.error("\nAn error occurred during the search process.");
  }
}

// Prompts the user for how to crawl and runs the crawler script.

async function promptForCrawl() {
  console.clear();
  console.log("--- PDF Crawler ---\n");

  const { crawlChoice } = await inquirer.prompt([
    {
      type: "list",
      name: "crawlChoice",
      message: "How do you want to select companies to crawl?",
      choices: [
        { name: "Enter a single GEMI number", value: "single" },
        { name: `Use all companies from ${RESULTS_FILE}`, value: "file" },
        new inquirer.Separator(),
        { name: "Back to main menu", value: "back" },
      ],
    },
  ]);

  if (crawlChoice === "back") {
    return;
  }

  if (crawlChoice === "single") {
    const { gemiId } = await inquirer.prompt([
      {
        type: "input",
        name: "gemiId",
        message: "Please enter the GEMI number:",
        validate: (input) =>
          isValidGemiId(input) || "Please enter a valid, numeric GEMI number.",
      },
    ]);
    try {
      await runScript(path.join(__dirname, "id_crawler.mjs"), ["--id", gemiId]);
    } catch (error) {
      console.error("\nAn error occurred during the crawl process.");
    }
  } else if (crawlChoice === "file") {
    // Check for results file in the crawler working directory
    const { getWorkingPath } = await import("../../../shared/workdir/index.mjs");
    const resultsPath = getWorkingPath('crawler', RESULTS_FILE);
    
    if (!fs.existsSync(resultsPath)) {
      console.error(`\n❌ Error: ${RESULTS_FILE} not found in crawler working directory.`);
      console.log("Please run a search first to generate the file.");
      return;
    }
    try {
      await runScript(path.join(__dirname, "id_crawler.mjs"), [
        "--file",
        resultsPath,
      ]);
    } catch (error) {
      console.error(
        "\nAn error occurred while crawling from the results file."
      );
    }
  }
}

// Main menu function that displays options and handles user input.
async function mainMenu() {
  while (true) {
    console.clear();
    console.log("====================================");
    console.log("  Business Portal Scraper Control   ");
    console.log("====================================\n");

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { name: "1. Search for companies", value: "search" },
          { name: "2. Download PDFs for companies", value: "crawl" },
          new inquirer.Separator(),
          { name: "3. Exit", value: "exit" },
        ],
      },
    ]);

    if (action === "search") {
      await promptForSearch();
    } else if (action === "crawl") {
      await promptForCrawl();
    } else if (action === "exit") {
      console.log("\nExiting application. Goodbye!");
      process.exit(0);
    }

    // Pause before showing the menu again
    await inquirer.prompt([
      {
        type: "input",
        name: "continue",
        message: "\nPress Enter to return to the main menu...",
      },
    ]);
  }
}

mainMenu().catch((err) => {
  console.error("A critical error occurred in the UI:", err);
});
