import fs from "fs/promises";
import path from "path";

import { runCrawlerForGemiIds } from "../../crawler/src/id_crawler.mjs";
import { processCompanyFiles } from "../../doc-scanner/src/processing-logic.mjs";
import { getMetadataModel } from "../../doc-scanner/src/gemini-config.mjs";
import { checkExistingMetadata } from "../../doc-scanner/src/metadata-checker.mjs";
import {
  createLogger,
  setGlobalProgressManager,
} from "../../../shared/logging/index.mjs";
import { progressManager } from "../../../shared/progress/index.mjs";

const logger = createLogger("CLI-PROCESSOR");

/**
 * Process company files with structured error handling
 */
async function runDocScannerSilently(
  files,
  downloadDir,
  scanOutputDir,
  gemiId,
  metadataModel
) {
  try {
    return await processCompanyFiles(
      files,
      downloadDir,
      scanOutputDir,
      gemiId,
      metadataModel
    );
  } catch (error) {
    // Don't log detailed errors during progress - they'll be shown in summary
    throw error;
  }
}

/**
 * Run crawler with structured error handling
 */
async function runCrawlerSilently(gemiIds, outputRoot) {
  try {
    return await runCrawlerForGemiIds(gemiIds, outputRoot);
  } catch (error) {
    // Don't log detailed errors during progress - they'll be shown in summary
    throw error;
  }
}

/**
 * Main processing logic: crawls and scans companies for given GEMI IDs
 */
export async function processCompanies(gemiIds, outputRoot) {
  const companies = [];
  const scanJobs = [];
  const failures = [];
  const noDocumentIds = [];
  let currentTotalOperations = gemiIds.length * 2; // crawl + potential scan each
  const progressCounter = { value: 0 }; // Use object for shared reference

  logger.info(`Starting processing of ${gemiIds.length} companies`);

  // Set up progress-aware logging
  setGlobalProgressManager(progressManager);

  // Create progress bar using new progress manager
  const progressBar = progressManager.createBar(currentTotalOperations, {
    format: "Progress |{bar}| {percentage}% | {value}/{total} operations",
  });

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
      const crawlMap = await runCrawlerSilently([gemiId], outputRoot);
      progressCounter.value++;
      progressManager.update(progressCounter.value, `Crawled ${gemiId}`); // Crawl completed

      // Structured crawl result expected
      const entry = crawlMap[gemiId];
      const crawlSuccess = entry?.success === true;
      const downloadDir = entry?.path || null;
      const crawlErrorCode = entry?.errorCode || "crawl-error";
      const crawlErrorMessage = entry?.errorMessage || "Unknown crawl error";

      if (!crawlSuccess) {
        result["processing-status"] = "crawl-failed";
        failures.push({
          gemiId,
          code: crawlErrorCode,
          message: crawlErrorMessage,
        });
        companies.push(result);
        progressCounter.value++;
        progressManager.update(
          progressCounter.value,
          `Skipped scan for ${gemiId} (crawl failed)`
        ); // Skip scan when crawl fails
        continue;
      }

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
        noDocumentIds.push(gemiId);
        companies.push(result);
        progressCounter.value++;
        progressManager.update(
          progressCounter.value,
          `No documents for ${gemiId}`
        ); // Skip scan - no files (we still count placeholder scan op)
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
        progressCounter.value++;
        progressManager.update(
          progressCounter.value,
          `${gemiId} already up to date`
        ); // Skip scan - already up to date
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
            failures.push({
              gemiId,
              code: "scan-failed",
              message: error.message || "Metadata loading failed",
            });
          }

          progressCounter.value++;
          progressManager.update(progressCounter.value, `Scanned ${gemiId}`); // Scan completed
          return result;
        })
        .catch((error) => {
          result["processing-status"] = "scan-failed";
          failures.push({
            gemiId,
            code: "scan-failed",
            message: error?.message || "Scan failed",
          });
          progressCounter.value++;
          progressManager.update(
            progressCounter.value,
            `Scan failed for ${gemiId}`
          ); // Scan failed
          return result;
        });

      scanJobs.push(scanJob);
    } catch (error) {
      progressCounter.value++;
      progressManager.update(
        progressCounter.value,
        `Crawl failed for ${gemiId}`
      ); // Crawl attempt completed (failed)
      result["processing-status"] = "crawl-failed";
      const code = error?.code || "crawl-error";
      failures.push({
        gemiId,
        code,
        message: error?.message || "Crawl failed",
      });
      companies.push(result);
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

  progressManager.stop();
  logger.info(
    `Processing completed. Success: ${companies.filter((c) => c["processing-status"] === "successful").length}/${companies.length}`
  );

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

  // Return both cleaned companies and calculated stats, plus categorized failures
  return {
    companies: cleanedCompanies,
    stats: finalStats,
    failures,
    noDocuments: noDocumentIds,
  };
}
