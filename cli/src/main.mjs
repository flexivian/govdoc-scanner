import path from "path";
import { fileURLToPath } from "url";

import {
  promptOperationMode,
  promptFileInput,
  promptManualGemiIds,
  promptRandomCount,
  promptConfirmation,
} from "./prompts.mjs";
import { loadInputFile, writeOutput, getRandomCompanies } from "./utils.mjs";
import { processCompanies } from "./processor.mjs";

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

  // Check if any command line arguments were provided
  const hasArgs = args.input || args.companyRandom !== null;

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
 * Run in command line mode with provided arguments
 */
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
      if (gemiIds.length === 0) {
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

    // Write output and show summary
    const outputFile = path.join(outputRoot, "govdoc-output.json");
    await writeOutput(companies, outputFile);

    // Print summary using stats from processor
    const totalProcessed = stats.successful + stats.noDocuments + stats.failed;

    console.log(`\n📊 Summary:`);
    console.log(`  Total processed: ${totalProcessed}`);
    console.log(`  Successfully scanned: ${stats.successful}`);
    if (stats.noDocuments > 0) {
      console.log(`  No documents found: ${stats.noDocuments}`);
    }
    console.log(`  Failed: ${stats.failed}`);

    console.log(`\n🎉 Processing completed successfully!`);
  } catch (error) {
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
        if (gemiIds.length === 0) {
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

    // 3. Confirm before processing
    const confirmed = await promptConfirmation(gemiIds, mode);
    if (!confirmed) {
      console.log("Operation cancelled.");
      process.exit(0);
    }

    // 4. Process the companies
    console.log(`\n🚀 Starting processing of ${gemiIds.length} companies...\n`);

    const outputRoot = path.join(projectRoot, "output");
    const result = await processCompanies(gemiIds, outputRoot);
    const companies = result.companies;
    const stats = result.stats;

    // 5. Write output and show summary
    const outputFile = path.join(outputRoot, "govdoc-output.json");
    await writeOutput(companies, outputFile);

    // Print summary using stats from processor
    const totalProcessed = stats.successful + stats.noDocuments + stats.failed;

    console.log(`\n📊 Summary:`);
    console.log(`  Total processed: ${totalProcessed}`);
    console.log(`  Successfully scanned: ${stats.successful}`);
    if (stats.noDocuments > 0) {
      console.log(`  No documents found: ${stats.noDocuments}`);
    }
    console.log(`  Failed: ${stats.failed}`);

    console.log(`\n🎉 Processing completed successfully!`);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the CLI
main().catch((err) => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});
