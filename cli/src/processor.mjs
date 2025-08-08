import fs from "fs/promises";
import path from "path";
import cliProgress from "cli-progress";

import { runCrawlerForGemiIds } from "../../apps/crawler/src/id_crawler.mjs";
import { processCompanyFiles } from "../../apps/doc-scanner/src/processing-logic.mjs";
import { getMetadataModel } from "../../apps/doc-scanner/src/gemini-config.mjs";
import { checkExistingMetadata } from "../../apps/doc-scanner/src/metadata-checker.mjs";

/**
 * Global suppression state to handle parallel operations
 */
let suppressionCount = 0;
let originalConsole = null;

/**
 * Start global output suppression (console methods only)
 */
function startGlobalSuppression() {
  if (suppressionCount === 0) {
    // First suppression - store originals and suppress console methods only
    originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };

    // Suppress only console methods, not stdout/stderr (to allow progress bar)
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
    console.info = () => {};
    console.debug = () => {};
  }
  suppressionCount++;
}

/**
 * End global output suppression
 */
function endGlobalSuppression() {
  suppressionCount--;
  if (suppressionCount === 0) {
    // Last suppression - restore originals
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;

    originalConsole = null;
  }
}

/**
 * Suppress console output while running doc-scanner
 */
async function runDocScannerSilently(
  files,
  downloadDir,
  scanOutputDir,
  gemiId,
  metadataModel
) {
  startGlobalSuppression();

  try {
    return await processCompanyFiles(
      files,
      downloadDir,
      scanOutputDir,
      gemiId,
      metadataModel
    );
  } finally {
    endGlobalSuppression();
  }
}

/**
 * Suppress console output while running crawler
 */
async function runCrawlerSilently(gemiIds, outputRoot) {
  startGlobalSuppression();

  try {
    return await runCrawlerForGemiIds(gemiIds, outputRoot);
  } finally {
    endGlobalSuppression();
  }
}

/**
 * Main processing logic: crawls and scans companies for given GEMI IDs
 */
export async function processCompanies(gemiIds, outputRoot) {
  const companies = [];
  const scanJobs = [];

  // Create progress bar for total operations (crawl + scan per company)
  const totalOperations = gemiIds.length * 2;
  const progressBar = new cliProgress.SingleBar(
    {
      format: "Progress |{bar}| {percentage}% | {value}/{total} operations",
      etaBuffer: 0,
    },
    cliProgress.Presets.shades_classic
  );

  progressBar.start(totalOperations, 0);

  // Process each GEMI ID serially for crawling, but start scanning immediately when ready
  for (const gemiId of gemiIds) {
    // Initialize result structure
    const result = {
      "gemi-id": gemiId,
      "company-name": "",
      "company-tax-id": "",
      "creation-date": "",
      "scan-date": new Date().toISOString(),
      metadata: {
        "current-snapshot": {},
      },
      "processing-status": "unknown", // Track processing status
    };

    try {
      // 1. Run crawler for this GEMI ID (serial)
      const downloadPaths = await runCrawlerSilently([gemiId], outputRoot);
      progressBar.increment(); // Crawl completed

      const downloadDir = downloadPaths[gemiId];

      // 2. Check if any documents were downloaded
      let files = [];
      if (downloadDir) {
        try {
          files = (await fs.readdir(downloadDir)).filter((f) =>
            /\.(pdf|docx?)$/i.test(f)
          );
        } catch {
          files = [];
        }
      }

      if (files.length === 0) {
        result["processing-status"] = "no-documents";
        companies.push(result);
        progressBar.increment(); // Skip scan - no files
        continue;
      }

      // 3. Check if metadata already exists and determine if scan is needed
      const scanOutputDir = path.join(outputRoot, gemiId);
      const processCheck = checkExistingMetadata(gemiId, scanOutputDir, files);

      if (!processCheck.shouldProcess) {
        // Load existing metadata
        try {
          const metadataFile = path.join(
            scanOutputDir,
            `${gemiId}_final_metadata.json`
          );
          const metadataContent = await fs.readFile(metadataFile, "utf-8");
          const metadata = JSON.parse(metadataContent);
          const companyData = metadata[gemiId];

          if (companyData) {
            // Extract key information from company data
            if (companyData["company-name"]) {
              result["company-name"] = companyData["company-name"];
            }
            if (companyData["company-tax-id"]) {
              result["company-tax-id"] = companyData["company-tax-id"];
            }
            if (companyData["creation-date"]) {
              result["creation-date"] = companyData["creation-date"];
            }

            // Store the inner current-snapshot directly (avoid double nesting)
            if (
              companyData.metadata &&
              companyData.metadata["current-snapshot"]
            ) {
              result.metadata["current-snapshot"] =
                companyData.metadata["current-snapshot"];
            }

            // Include tracked-changes section if available
            if (companyData["tracked-changes"]) {
              result["tracked-changes"] = companyData["tracked-changes"];
            }
          }

          result["processing-status"] = "successful";
        } catch (error) {
          result["processing-status"] = "scan-failed";
        }

        companies.push(result);
        progressBar.increment(); // Skip scan - already up to date
        continue;
      }

      // 4. Start scan job for this company (parallel, don't wait)
      const metadataModel = getMetadataModel();
      const filesToProcess = processCheck.filesToProcess;

      const scanJob = runDocScannerSilently(
        filesToProcess,
        downloadDir,
        scanOutputDir,
        gemiId,
        metadataModel
      )
        .then(async () => {
          // Load the generated metadata
          const metadataFile = path.join(
            scanOutputDir,
            `${gemiId}_final_metadata.json`
          );
          try {
            const metadataContent = await fs.readFile(metadataFile, "utf-8");
            const metadata = JSON.parse(metadataContent);

            // The metadata file has structure: {gemi_id: {company_data}}
            // Extract the company data for this GEMI ID
            const companyData = metadata[gemiId];

            if (companyData) {
              // Extract key information from company data
              if (companyData["company-name"]) {
                result["company-name"] = companyData["company-name"];
              }
              if (companyData["company-tax-id"]) {
                result["company-tax-id"] = companyData["company-tax-id"];
              }
              if (companyData["creation-date"]) {
                result["creation-date"] = companyData["creation-date"];
              }

              // Store the inner current-snapshot directly (avoid double nesting)
              if (
                companyData.metadata &&
                companyData.metadata["current-snapshot"]
              ) {
                result.metadata["current-snapshot"] =
                  companyData.metadata["current-snapshot"];
              }

              // Include tracked-changes section if available
              if (companyData["tracked-changes"]) {
                result["tracked-changes"] = companyData["tracked-changes"];
              }
            }

            result["processing-status"] = "successful";
          } catch (error) {
            // Metadata loading failed, but scan job completed
            result["processing-status"] = "scan-failed";
          }

          progressBar.increment(); // Scan completed
          return result;
        })
        .catch((error) => {
          result["processing-status"] = "scan-failed";
          progressBar.increment(); // Scan failed
          return result;
        });

      scanJobs.push(scanJob);
    } catch (error) {
      progressBar.increment(); // Crawl failed
      result["processing-status"] = "crawl-failed";
      companies.push(result);
      progressBar.increment(); // Skip scan for failed crawl
    }

    // Continue to next crawler immediately (don't wait for scan to complete)
  }

  // Wait for all scan jobs to complete
  const scanResults = await Promise.allSettled(scanJobs);

  // Add scan results to companies array (companies without scans were already added)
  for (const scanResult of scanResults) {
    if (scanResult.status === "fulfilled") {
      // Find and replace the corresponding company entry
      const scannedCompany = scanResult.value;
      const index = companies.findIndex(
        (c) => c["gemi-id"] === scannedCompany["gemi-id"]
      );
      if (index >= 0) {
        companies[index] = scannedCompany; // Replace with scanned version
      } else {
        companies.push(scannedCompany); // Add if not found
      }
    }
  }

  progressBar.stop();

  // Calculate final stats based on processing-status of all companies
  const finalStats = {
    successful: companies.filter((c) => c["processing-status"] === "successful")
      .length,
    noDocuments: companies.filter(
      (c) => c["processing-status"] === "no-documents"
    ).length,
    failed: companies.filter(
      (c) =>
        c["processing-status"] === "scan-failed" ||
        c["processing-status"] === "crawl-failed"
    ).length,
  };

  // Filter companies to only include successful ones for final output
  const successfulCompanies = companies.filter(
    (company) => company["processing-status"] === "successful"
  );

  // Remove processing-status from final output
  const cleanedCompanies = successfulCompanies.map(
    ({ "processing-status": _, ...company }) => company
  );

  // Return both cleaned companies and calculated stats
  return { companies: cleanedCompanies, stats: finalStats };
}
