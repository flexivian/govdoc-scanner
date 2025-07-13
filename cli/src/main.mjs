import path from "path";
import { fileURLToPath } from "url";

import {
  promptOperationMode,
  promptFileInput,
  promptManualGemiIds,
  promptVatNumbers,
  promptRandomCount,
  promptConfirmation
} from "./prompts.mjs";
import {
  loadInputFile,
  writeOutput,
  searchCompaniesByVat,
  getRandomCompanies
} from "./utils.mjs";
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
    companyVat: null,
    companyRandom: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--input":
        if (args[i + 1]) {
          parsed.input = args[i + 1];
          i++; // Skip next argument as it's the value
        }
        break;
      case "--company-vat":
        if (args[i + 1]) {
          parsed.companyVat = args[i + 1].split(",").map(vat => vat.trim());
          i++; // Skip next argument as it's the value
        }
        break;
      case "--company-random":
        if (args[i + 1]) {
          const count = parseInt(args[i + 1]);
          if (!isNaN(count) && count > 0) {
            parsed.companyRandom = count;
          }
          i++; // Skip next argument as it's the value
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
  console.log("  --company-vat <VAT1,VAT2>   Search companies by VAT numbers (coming soon)");
  console.log("  --company-random <count>    Process random companies (coming soon)");
  console.log("  --help, -h                  Show this help message");
  console.log("");
  console.log("Examples:");
  console.log("  node cli/src/main.mjs --input ./companies.gds");
  console.log("  npm start govdoc -- --input ./companies.gds");
  console.log("  npm start govdoc -- --company-vat 123456789,987654321");
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
  const hasArgs = args.input || args.companyVat || args.companyRandom !== null;

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
    } else if (args.companyVat) {
      mode = "vat";
      console.log(`🔍 Searching for companies with VAT numbers: ${args.companyVat.join(", ")}`);
      gemiIds = await searchCompaniesByVat(args.companyVat);
      if (gemiIds.length === 0) {
        console.log("❌ No companies found or feature not implemented yet.");
        process.exit(0);
      }
    } else if (args.companyRandom !== null) {
      mode = "random";
      console.log(`🎲 Getting ${args.companyRandom} random companies...`);
      gemiIds = await getRandomCompanies(args.companyRandom);
      if (gemiIds.length === 0) {
        console.log("❌ Could not get random companies or feature not implemented yet.");
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
    const companies = await processCompanies(gemiIds, outputRoot);

    // Write output and show summary
    const outputFile = path.join(outputRoot, "govdoc-output.json");
    await writeOutput(companies, outputFile);

    // Print summary
    const successful = companies.filter(
      (c) => Object.keys(c.metadata["current-snapshot"]).length > 0
    ).length;

    console.log(`\n📊 Summary:`);
    console.log(`  Total processed: ${companies.length}`);
    console.log(`  Successfully scanned: ${successful}`);
    console.log(`  Failed: ${companies.length - successful}`);

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

      case "vat": {
        const vatNumbers = await promptVatNumbers();
        console.log(`🔍 Searching for companies with VAT numbers: ${vatNumbers.join(", ")}`);
        gemiIds = await searchCompaniesByVat(vatNumbers);
        if (gemiIds.length === 0) {
          console.log("❌ No companies found or feature not implemented yet.");
          process.exit(0);
        }
        break;
      }

      case "random": {
        const count = await promptRandomCount();
        console.log(`🎲 Getting ${count} random companies...`);
        gemiIds = await getRandomCompanies(count);
        if (gemiIds.length === 0) {
          console.log("❌ Could not get random companies or feature not implemented yet.");
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
    const companies = await processCompanies(gemiIds, outputRoot);

    // 5. Write output and show summary
    const outputFile = path.join(outputRoot, "govdoc-output.json");
    await writeOutput(companies, outputFile);

    // Print summary
    const successful = companies.filter(
      (c) => Object.keys(c.metadata["current-snapshot"]).length > 0
    ).length;

    console.log(`\n📊 Summary:`);
    console.log(`  Total processed: ${companies.length}`);
    console.log(`  Successfully scanned: ${successful}`);
    console.log(`  Failed: ${companies.length - successful}`);

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
