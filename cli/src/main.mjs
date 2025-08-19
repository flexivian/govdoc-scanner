import path from "path";
import { fileURLToPath } from "url";

import {
  promptOperationMode,
  promptFileInput,
  promptManualGemiIds,
  promptRandomCount,
} from "./prompts.mjs";
import { loadInputFile, writeOutput, getRandomCompanies } from "./utils.mjs";
import { processCompanies } from "./processor.mjs";
import {
  validateConfig,
  validateApiKey,
} from "../../shared/config/validator.mjs";
import { createLogger } from "../../shared/logging/index.mjs";
import { progressManager } from "../../shared/progress/index.mjs";

const logger = createLogger("CLI-MAIN");

// Map failure codes to concise messages for summary listing
function mapFailureCodeToMessage(code) {
  switch (code) {
    case "browser-launch-failed":
      return "browser failed to start";
    case "company-not-found":
      return "company doesn't exist";
    case "site-navigation-timeout":
      return "GEMI site didn't load";
    case "scan-failed":
      return "scan failed";
    case "no-search-results":
      return "no random search results";
    default:
      return "operation failed";
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    input: null,
    companyRandom: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--input":
        if (args[i + 1]) {
          parsed.input = args[i + 1];
          i++; // Skip next argument as it's the value
        } else {
          console.error("❌ Error: --input requires a file path argument");
          process.exit(1);
        }
        break;
      case "--company-random":
        if (args[i + 1]) {
          const count = parseInt(args[i + 1], 10);
          if (!isNaN(count) && count > 0) {
            parsed.companyRandom = count;
          } else {
            console.error(
              "❌ Error: --company-random requires a positive number"
            );
            process.exit(1);
          }
          i++; // Skip next argument as it's the value
        } else {
          console.error(
            "❌ Error: --company-random requires a number argument"
          );
          process.exit(1);
        }
        break;
      case "--help":
      case "-h":
        parsed.help = true;
        break;
    }
  }

  return parsed;
}

/**
 * Show command line help
 */
function showHelp() {
  console.log("\n🇬🇷 GovDoc Scanner CLI\n");
  console.log("Usage:");
  console.log("  node cli/src/main.mjs [options]");
  console.log("  npm start govdoc [-- options]");
  console.log("");
  console.log("Options:");
  console.log("  --input <file>              Process GEMI IDs from .gds file");
  console.log("  --company-random <count>    Process random companies");
  console.log("  --help, -h                  Show this help message");
  console.log("");
  console.log("Examples:");
  console.log("  node cli/src/main.mjs --input ./companies.gds");
  console.log("  npm start govdoc -- --input ./companies.gds");
  console.log("  npm start govdoc -- --company-random 10");
  console.log("");
  console.log("Interactive Mode:");
  console.log("  Run without arguments to use interactive prompts");
  console.log("  node cli/src/main.mjs");
  console.log("  npm start govdoc");
  console.log("");
}

/**
 * Main CLI application
 */
async function main() {
  const args = parseArgs();

  // Show help if requested
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Validate configuration at startup
  try {
    validateConfig();
    console.log("✅ Configuration validated successfully");
  } catch (error) {
    console.error(`❌ Configuration Error: ${error.message}`);
    process.exit(1);
  }

  // Check if any command line arguments were provided
  const hasArgs = args.input || args.companyRandom !== null;
  // Early API key validation
  const online = await validateApiKey();
  if (!online.ok) {
    console.error(`\n❌ Invalid API key: ${online.reason}`);
    process.exit(1);
  }
  if (hasArgs) {
    // Command line mode
    console.log("\n🇬🇷 GovDoc Scanner CLI - Command Line Mode\n");
    await runCommandLineMode(args);
  } else {
    // Interactive mode
    console.log("\n🇬🇷 GovDoc Scanner CLI - Interactive Mode\n");
    await runInteractiveMode();
  }
}

/**
 * Print processing summary with proper terminal cleanup
 */
async function printSummary(stats, failures, noDocs = []) {
  // Force stop and clear progress bar completely
  progressManager.forceStop();

  // Longer delay to ensure all async error logging is complete
  await new Promise((resolve) => setTimeout(resolve, 300));

  const totalProcessed = stats.successful + stats.noDocuments + stats.failed;

  // Clear any remaining terminal artifacts and start fresh
  process.stdout.write(`\n\n📊 Summary:\n`);
  process.stdout.write(`  Total processed: ${totalProcessed}\n`);
  process.stdout.write(`  Successfully scanned: ${stats.successful}\n`);

  if (stats.noDocuments > 0) {
    process.stdout.write(`  No documents found: ${stats.noDocuments}\n`);
  }

  process.stdout.write(`  Failed: ${stats.failed}\n`);

  if (failures.length > 0) {
    const lines = failures.map(
      (f) => `    - ${f.gemiId} ${mapFailureCodeToMessage(f.code)}`
    );
    process.stdout.write(lines.join("\n") + "\n");
  }

  if (noDocs.length > 0) {
    process.stdout.write("  Companies with no documents:\n");
    for (const id of noDocs) {
      process.stdout.write(`    - ${id}\n`);
    }
  }
}

async function runCommandLineMode(args) {
  try {
    let gemiIds = [];
    let mode = "";

    // Process based on provided arguments
    if (args.input) {
      mode = "file";
      console.log(`Loading GEMI IDs from: ${args.input}`);
      gemiIds = await loadInputFile(args.input);
      console.log(`✅ Loaded ${gemiIds.length} GEMI ID(s) from file.`);
    } else if (args.companyRandom !== null) {
      mode = "random";
      console.log(`🎲 Getting ${args.companyRandom} random companies...`);
      gemiIds = await getRandomCompanies(args.companyRandom);
      if (!Array.isArray(gemiIds) || gemiIds.length === 0) {
        console.log(
          "❌ Could not find any random companies. Please try again later."
        );
        process.exit(0);
      }
    }

    if (gemiIds.length === 0) {
      console.log("❌ No GEMI IDs to process.");
      process.exit(1);
    }

    // Process the companies (no confirmation in command line mode)
    console.log(`\n🚀 Starting processing of ${gemiIds.length} companies...\n`);

    const outputRoot = path.join(projectRoot, "output");
    const result = await processCompanies(gemiIds, outputRoot);
    const companies = result.companies;
    const stats = result.stats;
    const failures = result.failures || [];
    const noDocs = result.noDocuments || [];

    // Write output and show summary
    if (stats.successful > 0) {
      const outputFile = path.join(outputRoot, "govdoc-output.json");
      await writeOutput(companies, outputFile);
    }

    // Print summary using stats from processor
    await printSummary(stats, failures, noDocs);

    process.stdout.write(`\n🎉 Processing completed.\n`);
  } catch (error) {
    // Ensure progress bar is stopped on error
    progressManager.forceStop();
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Run in interactive mode with prompts
 */
async function runInteractiveMode() {
  try {
    // 1. Get operation mode
    const mode = await promptOperationMode();

    let gemiIds = [];

    // 2. Get input based on selected mode
    switch (mode) {
      case "file": {
        const filePath = await promptFileInput();
        gemiIds = await loadInputFile(filePath);
        console.log(`✅ Loaded ${gemiIds.length} GEMI ID(s) from file.`);
        break;
      }

      case "manual": {
        gemiIds = await promptManualGemiIds();
        console.log(`✅ Received ${gemiIds.length} GEMI ID(s).`);
        break;
      }

      case "random": {
        const count = await promptRandomCount();
        console.log(`🎲 Getting ${count} random companies...`);
        gemiIds = await getRandomCompanies(count);
        if (!Array.isArray(gemiIds) || gemiIds.length === 0) {
          console.log(
            "❌ Could not find any random companies. Please try again later."
          );
          process.exit(0);
        }
        break;
      }

      default:
        console.log("❌ Invalid operation mode selected.");
        process.exit(1);
    }

    // 3. Process the companies
    console.log(`\n🚀 Starting processing of ${gemiIds.length} companies...\n`);

    const outputRoot = path.join(projectRoot, "output");
    const result = await processCompanies(gemiIds, outputRoot);
    const companies = result.companies;
    const stats = result.stats;
    const failures = result.failures || [];
    const noDocs = result.noDocuments || [];

    // 4. Write output and show summary
    if (stats.successful > 0) {
      const outputFile = path.join(outputRoot, "govdoc-output.json");
      await writeOutput(companies, outputFile);
    }

    // Print summary using stats from processor
    await printSummary(stats, failures, noDocs);

    process.stdout.write(`\n🎉 Processing completed.\n`);
  } catch (error) {
    // Ensure progress bar is stopped on error
    progressManager.forceStop();
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the CLI
main().catch((err) => {
  // Ensure progress bar is stopped on unexpected error
  progressManager.forceStop();
  console.error("Unexpected error:", err.message);
  process.exit(1);
});
