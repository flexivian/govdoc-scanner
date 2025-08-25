import path from "path";
import { fileURLToPath } from "url";

import {
  promptOperationMode,
  promptFileInput,
  promptManualGemiIds,
  promptRandomCount,
} from "./prompts.mjs";
import { loadInputFile, writeOutput, getRandomCompanies } from "./utils.mjs";
import { pushCompaniesToOpenSearch } from "./opensearch.mjs";
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
    push: false,
    os: {
      endpoint: process.env.OPENSEARCH_URL || null,
      username: process.env.OPENSEARCH_USERNAME || null,
      password: process.env.OPENSEARCH_PASSWORD || null,
      index: process.env.OPENSEARCH_INDEX || "govdoc-companies-000001",
      indexStrategy: process.env.OPENSEARCH_INDEX_STRATEGY || "static",
      insecure: ["1", "true", "yes"].includes(
        (process.env.OPENSEARCH_INSECURE || "").toLowerCase()
      ),
      batchSize: parseInt(process.env.OPENSEARCH_BATCH_SIZE || "500", 10),
      refresh: ["1", "true", "yes"].includes(
        (process.env.OPENSEARCH_REFRESH || "").toLowerCase()
      ),
    },
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
      case "--push":
        parsed.push = true;
        break;
      case "--os.endpoint":
        if (args[i + 1]) {
          parsed.os.endpoint = args[i + 1];
          i++;
        } else {
          console.error("❌ Error: --os.endpoint requires a value");
          process.exit(1);
        }
        break;
      case "--os.username":
        if (args[i + 1]) {
          parsed.os.username = args[i + 1];
          i++;
        } else {
          console.error("❌ Error: --os.username requires a value");
          process.exit(1);
        }
        break;
      case "--os.password":
        if (args[i + 1]) {
          parsed.os.password = args[i + 1];
          i++;
        } else {
          console.error("❌ Error: --os.password requires a value");
          process.exit(1);
        }
        break;
      case "--os.index":
        if (args[i + 1]) {
          parsed.os.index = args[i + 1];
          i++;
        } else {
          console.error("❌ Error: --os.index requires a value");
          process.exit(1);
        }
        break;
      case "--os.index-strategy":
        if (args[i + 1]) {
          parsed.os.indexStrategy = args[i + 1];
          i++;
        } else {
          console.error("❌ Error: --os.index-strategy requires a value");
          process.exit(1);
        }
        break;
      case "--os.insecure":
        parsed.os.insecure = true;
        break;
      case "--os.batch-size":
        if (args[i + 1]) {
          const bs = parseInt(args[i + 1], 10);
          if (!isNaN(bs) && bs > 0) {
            parsed.os.batchSize = bs;
            i++;
          } else {
            console.error(
              "❌ Error: --os.batch-size requires a positive number"
            );
            process.exit(1);
          }
        } else {
          console.error("❌ Error: --os.batch-size requires a value");
          process.exit(1);
        }
        break;
      case "--os.refresh":
        parsed.os.refresh = true;
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
  console.log(
    "  --push                      Push results to OpenSearch after processing"
  );
  console.log(
    "  --os.endpoint <url>         OpenSearch endpoint (e.g., https://localhost:9200)"
  );
  console.log("  --os.username <user>        OpenSearch username");
  console.log("  --os.password <pass>        OpenSearch password");
  console.log(
    "  --os.index <name>           Base index name (default: govdoc-companies-000001)"
  );
  console.log(
    "  --os.index-strategy <s>     Index naming: static|by-year (default: static)"
  );
  console.log(
    "  --os.insecure               Allow self-signed certs for HTTPS endpoint"
  );
  console.log("  --os.batch-size <n>         Bulk batch size (default: 500)");
  console.log("  --os.refresh                Use refresh=wait_for on bulk");
  console.log("  --help, -h                  Show this help message");
  console.log("");
  console.log("Examples:");
  console.log("  node cli/src/main.mjs --input ./companies.gds");
  console.log("  npm start govdoc -- --input ./companies.gds");
  console.log(
    "  node cli/src/main.mjs --input ./companies.gds --push --os.endpoint https://localhost:9200"
  );
  console.log(
    "    --os.username admin --os.password admin --os.index govdoc-companies-000001"
  );
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

    // Optional: push to OpenSearch
    if (args.push) {
      process.stdout.write("\n📤 Pushing to OpenSearch...\n");
      const { success, failed, errors } = await pushCompaniesToOpenSearch(
        companies,
        {
          endpoint: args.os.endpoint,
          username: args.os.username,
          password: args.os.password,
          index: args.os.index,
          indexStrategy: args.os.indexStrategy,
          insecure: args.os.insecure,
          batchSize: args.os.batchSize,
          refresh: args.os.refresh,
        }
      );
      process.stdout.write(`✅ Indexed: ${success} | ❌ Failed: ${failed}\n`);
      if (failed && errors.length) {
        process.stdout.write("  First 3 errors:\n");
        for (const e of errors.slice(0, 3)) {
          process.stdout.write(
            `   - [${e.index}/${e.id}] ${e.error?.type || ""} ${e.error?.reason || ""}\n`
          );
        }
      }
    }

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

    // Optional: push to OpenSearch if env-driven
    const envPush = ["1", "true", "yes"].includes(
      (process.env.OPENSEARCH_PUSH || "").toLowerCase()
    );
    if (envPush) {
      process.stdout.write("\n📤 Pushing to OpenSearch...\n");
      const { success, failed, errors } = await pushCompaniesToOpenSearch(
        companies,
        {
          endpoint: process.env.OPENSEARCH_URL,
          username: process.env.OPENSEARCH_USERNAME,
          password: process.env.OPENSEARCH_PASSWORD,
          index: process.env.OPENSEARCH_INDEX || "govdoc-companies-000001",
          indexStrategy: process.env.OPENSEARCH_INDEX_STRATEGY || "static",
          insecure: ["1", "true", "yes"].includes(
            (process.env.OPENSEARCH_INSECURE || "").toLowerCase()
          ),
          batchSize: parseInt(process.env.OPENSEARCH_BATCH_SIZE || "500", 10),
          refresh: ["1", "true", "yes"].includes(
            (process.env.OPENSEARCH_REFRESH || "").toLowerCase()
          ),
        }
      );
      process.stdout.write(`✅ Indexed: ${success} | ❌ Failed: ${failed}\n`);
      if (failed && errors.length) {
        process.stdout.write("  First 3 errors:\n");
        for (const e of errors.slice(0, 3)) {
          process.stdout.write(
            `   - [${e.index}/${e.id}] ${e.error?.type || ""} ${e.error?.reason || ""}\n`
          );
        }
      }
    }

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
