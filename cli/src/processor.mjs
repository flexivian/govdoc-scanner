import fs from "fs/promises";
import path from "path";
import cliProgress from "cli-progress";

import { runCrawlerForGemiIds } from "../../apps/crawler/src/id_crawler.mjs";
import { processCompanyFiles } from "../../apps/doc-scanner/src/processing-logic.mjs";
import { getMetadataModel } from "../../apps/doc-scanner/src/gemini-config.mjs";

/**
 * Suppress console output while running crawler
 */
async function runCrawlerSilently(gemiIds, outputRoot) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalStdoutWrite = process.stdout.write;

  // Suppress all crawler output including stdout writes
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  process.stdout.write = () => true; // Suppress progress indicators

  try {
    return await runCrawlerForGemiIds(gemiIds, outputRoot);
  } finally {
    // Restore original console methods and stdout
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    process.stdout.write = originalStdoutWrite;
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
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  // Suppress all doc-scanner output
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};

  try {
    return await processCompanyFiles(
      files,
      downloadDir,
      scanOutputDir,
      gemiId,
      metadataModel
    );
  } finally {
    // Restore original console methods
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
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
    };

    try {
      // 1. Run crawler for this GEMI ID (serial)
      const downloadPaths = await runCrawlerSilently([gemiId], outputRoot);
      progressBar.increment(); // Crawl completed

      const downloadDir = downloadPaths[gemiId];
      if (!downloadDir) {
        companies.push(result);
        progressBar.increment(); // Skip scan - no download dir
        continue;
      }

      // 2. Check if any documents were downloaded
      let files = [];
      try {
        files = (await fs.readdir(downloadDir)).filter((f) =>
          /\.(pdf|docx?)$/i.test(f)
        );
      } catch {
        companies.push(result);
        progressBar.increment(); // Skip scan - can't read dir
        continue;
      }

      if (files.length === 0) {
        companies.push(result);
        progressBar.increment(); // Skip scan - no files
        continue;
      }

      // 3. Start scan job for this company (parallel, don't wait)
      const scanOutputDir = path.join(outputRoot, gemiId);
      const metadataModel = getMetadataModel();

      const scanJob = runDocScannerSilently(
        files,
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
              if (companyData.metadata && companyData.metadata["current-snapshot"]) {
                result.metadata["current-snapshot"] = companyData.metadata["current-snapshot"];
              }
            }
          } catch (error) {
            // Metadata loading failed, but scan job completed
          }

          progressBar.increment(); // Scan completed
          return result;
        })
        .catch((error) => {
          progressBar.increment(); // Scan failed
          return result;
        });

      scanJobs.push(scanJob);
    } catch (error) {
      progressBar.increment(); // Crawl failed
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
  return companies;
}
