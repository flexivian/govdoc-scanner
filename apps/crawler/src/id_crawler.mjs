import { chromium } from "playwright";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import mime from "mime-types";
import { config } from "../../../shared/config/index.mjs";

// ES Module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import crawler configuration from centralized config
const {
  baseUrl: BASE_URL,
  pageLoadTimeoutMs: PAGE_LOAD_TIMEOUT_IN_MILLISECONDS,
  downloadTimeoutMs: DOWNLOAD_TIMEOUT_AXIOS,
  userAgent: USER_AGENT,
} = config.crawler;

// Downloads a document using Axios
async function downloadWithAxios(documentUrl, outputPath) {
  try {
    const response = await axios({
      method: "GET",
      url: documentUrl,
      responseType: "stream",
      headers: {
        "User-Agent": USER_AGENT,
        Referer: BASE_URL,
      },
      timeout: DOWNLOAD_TIMEOUT_AXIOS,
    });

    // Determine extension from response headers if not already present
    let finalOutputPath = outputPath;
    if (!path.extname(outputPath)) {
      const headers = response.headers;
      let ext = "";

      // Try Content-Disposition first
      const cd = headers["content-disposition"];
      if (cd) {
        const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/.exec(cd);
        if (m) {
          ext = path.extname(m[1]).toLowerCase();
        }
      }

      // Fallback to Content-Type
      if (!ext && headers["content-type"]) {
        const ctype = headers["content-type"].toLowerCase();
        if (ctype.includes("pdf")) {
          ext = ".pdf";
        } else if (ctype.includes("msword")) {
          ext = ".doc";
        } else if (ctype.includes("openxmlformats")) {
          ext = ".docx";
        } else {
          const guess = mime.extension(ctype);
          if (guess) ext = "." + guess;
        }
      }

      if (ext) {
        finalOutputPath = outputPath + ext;

        // Check for conflicts with the new extension
        let i = 1;
        while (fs.existsSync(finalOutputPath)) {
          const base = outputPath;
          finalOutputPath = `${base}_(${i++})${ext}`;
        }
      }
    }

    const writer = fs.createWriteStream(finalOutputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(finalOutputPath));
      writer.on("error", cleanupAndReject);
      response.data.on("error", cleanupAndReject);

      function cleanupAndReject(err) {
        if (fs.existsSync(finalOutputPath)) fs.unlinkSync(finalOutputPath);
        writer.close();
        reject(err);
      }
    });
  } catch (error) {
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    throw error;
  }
}

// Parses the HTML and extracts download links (.pdf, .doc, .docx)
async function extractDownloadLinks(html, downloadDir) {
  const $ = cheerio.load(html);
  const selector =
    'a[href^="/api/download/Modifications/"], a[href^="/api/download/YMSdata/"]';
  const seen = new Set();
  const downloadLinks = [];

  for (const el of $(selector).toArray()) {
    const rel = $(el).attr("href");
    if (!rel || seen.has(rel)) continue;
    seen.add(rel);

    const fullUrl = BASE_URL + rel;
    let name = rel.split("/").pop().split("?")[0] || `file_${seen.size}`;

    // Extract date from the table row containing this download link
    let datePrefix = "";
    const $row = $(el).closest("tr");
    if ($row.length > 0) {
      const $firstCell = $row.find("td").first();
      const dateText = $firstCell.text().trim();
      // Check if it matches DD/MM/YYYY format
      const dateMatch = dateText.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (dateMatch) {
        // Convert DD/MM/YYYY to YYYY-MM-DD format for filename
        const [, day, month, year] = dateMatch;
        datePrefix = `${year}-${month}-${day}_`;
      }
    }

    // Add date prefix to the filename if we found a date
    const baseFileName = datePrefix + name;
    let out = path.join(downloadDir, baseFileName);

    // Skip if file already exists (check for common extensions)
    const extensions = [".pdf", ".doc", ".docx"];
    let fileExists = false;
    for (const ext of extensions) {
      if (fs.existsSync(out + ext)) {
        console.log(
          `Skipping ${path.basename(out + ext)} - file already exists`
        );
        fileExists = true;
        break;
      }
    }

    if (fileExists) {
      continue;
    }

    downloadLinks.push({ url: fullUrl, path: out, sourceUrl: rel });
  }

  return { downloadLinks, downloadDir };
}

// Downloads all the extracted document links
async function downloadAll(documentLinks) {
  let downloadedCount = 0;
  const failedDownloads = [];

  // First attempt
  for (let i = 0; i < documentLinks.length; i++) {
    const documentInfo = documentLinks[i];
    try {
      const actualPath = await downloadWithAxios(
        documentInfo.url,
        documentInfo.path
      );
      downloadedCount++;
      console.log(
        `Downloaded: ${downloadedCount}/${documentLinks.length} - ${path.basename(actualPath)}`
      );
    } catch (err) {
      console.error(
        `\nFailed to download document from ${documentInfo.sourceUrl}: ${err.message}`
      );
      failedDownloads.push(documentInfo);
    }
  }
  console.log(); // New line after progress

  // Retry failed downloads
  if (failedDownloads.length > 0) {
    console.log(`\nRetrying ${failedDownloads.length} failed downloads...`);
    let retrySuccessCount = 0;

    for (let i = 0; i < failedDownloads.length; i++) {
      const documentInfo = failedDownloads[i];
      try {
        process.stdout.write(`\rRetrying: ${i + 1}/${failedDownloads.length}`);
        const actualPath = await downloadWithAxios(
          documentInfo.url,
          documentInfo.path
        );
        downloadedCount++;
        retrySuccessCount++;
      } catch (err) {
        console.error(
          `\n✗ Retry failed for ${documentInfo.sourceUrl}: ${err.message}`
        );
      }
    }
    console.log(
      `\nRetry completed: ${retrySuccessCount}/${failedDownloads.length} successful`
    );
  }

  const totalAttempted = documentLinks.length;
  const finalFailedCount = totalAttempted - downloadedCount;
  if (finalFailedCount > 0) {
    console.log(`  Failed downloads: ${finalFailedCount}`);
  }

  return downloadedCount;
}

// Main workflow for a single ID
async function fetchCompanyDocuments(context, gemiId, downloadPath) {
  const companyPageUrl = `${BASE_URL}/company/${gemiId}`;
  let page = null;

  try {
    page = await context.newPage();
    await page.goto(companyPageUrl, {
      waitUntil: "networkidle",
      timeout: PAGE_LOAD_TIMEOUT_IN_MILLISECONDS,
    });

    const html = await page.content();

    // Check for "Not found" in the page content
    if (html.includes("Not found")) {
      const err = new Error(
        `Company with GEMI ID ${gemiId} not found. Please check the ID or try again later.`
      );
      err.code = "company-not-found";
      throw err;
    }

    try {
      await page.waitForSelector("div#title", { timeout: 4000 });
    } catch {
      // Browser loaded but the site content didn't render expected title in time
      const err = new Error("Site content did not load in time");
      err.code = "site-navigation-timeout";
      throw err;
    }

    try {
      // Wait for the page to load and the modification history to appear
      await page.waitForSelector("div#ModificationHistory", { timeout: 1000 });
    } catch {
      // If the modification history doesn't load:
      // No pdfs are available, so we can continue and find 0 or
      // pdfs exist but not under modification history
      // so we continue nonetheless
    }

    // Pass the final, desired download path directly to the extractor
    const { downloadLinks, downloadDir } = await extractDownloadLinks(
      html,
      downloadPath
    );

    if (downloadLinks.length > 0) {
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      console.log(
        `Found ${downloadLinks.length} Document(s). Saving to: ${downloadDir}`
      );
      await downloadAll(downloadLinks);
      return { success: true, downloadDir };
    } else {
      console.log("No Documents found to download.");
      return { success: true, downloadDir };
    }
  } catch (error) {
    console.error(`Error processing GEMI ID ${gemiId}: ${error.message}`);
    // Map common crawler error scenarios to stable codes
    let code = error.code || "crawl-error";
    if (!code) {
      const msg = String(error.message || "").toLowerCase();
      if (error.name === "TimeoutError" || msg.includes("timeout")) {
        code = "site-navigation-timeout"; // Browser loaded, site didn't load
      }
    }
    return { success: false, errorCode: code, errorMessage: error.message };
  } finally {
    if (page) await page.close();
  }
}

// It takes an array of GEMI IDs, launches a browser, processes each ID,
// and returns a map of GEMI IDs to their download folder paths.
export async function runCrawlerForGemiIds(gemiIds, outputBaseDir) {
  const finalDownloadPaths = {};
  let browser = null;

  try {
    try {
      browser = await chromium.launch({
        headless: config.crawler.headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
        ],
      });
    } catch (e) {
      const err = new Error(`Failed to launch browser: ${e.message}`);
      err.code = "browser-launch-failed";
      throw err;
    }

    const context = await browser.newContext({
      userAgent: USER_AGENT,
    });

    for (const [index, gemiId] of gemiIds.entries()) {
      console.log(
        `\n--- Processing ${index + 1}/${gemiIds.length}: ${gemiId} ---`
      );

      // Construct the final, desired download path
      const gemiDownloadPath = path.join(
        outputBaseDir,
        gemiId,
        "document_downloads"
      );

      // Pass the final path to the fetcher
      const res = await fetchCompanyDocuments(
        context,
        gemiId,
        gemiDownloadPath
      );
      if (res && res.success) {
        finalDownloadPaths[gemiId] = { path: gemiDownloadPath, success: true };
      } else {
        finalDownloadPaths[gemiId] = {
          path: gemiDownloadPath,
          success: false,
          errorCode: res?.errorCode || "crawl-error",
          errorMessage: res?.errorMessage || "Unknown crawl error",
        };
      }
    }
  } catch (error) {
    console.error("A critical error occurred during crawling:", error);
    // Re-throw to allow caller to categorize (e.g., browser-launch-failed)
    throw error;
  } finally {
    if (browser) await browser.close();
  }
  return finalDownloadPaths;
}

// Main function to allow this script to be run standalone
async function main() {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf("--id");
  const fileIndex = args.indexOf("--file");

  let gemiIds = [];

  if (idIndex !== -1 && args[idIndex + 1]) {
    const gemiId = args[idIndex + 1].trim();
    if (!/^\d+$/.test(gemiId)) {
      console.error("Invalid GEMI ID format. Please enter numbers only.");
      return;
    }
    gemiIds.push(gemiId);
  } else if (fileIndex !== -1 && args[fileIndex + 1]) {
    const filePath = args[fileIndex + 1];
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found at ${filePath}`);
      return;
    }
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      gemiIds = fileContent
        .split("\n")
        .map((id) => id.trim())
        .filter((id) => /^\d+$/.test(id));
      console.log(`Loaded ${gemiIds.length} valid GEMI IDs from ${filePath}`);
    } catch (e) {
      console.error(`Error reading or parsing ${filePath}:`, e.message);
      return;
    }
  } else {
    console.log("This script should be run via npm start.");
    return;
  }

  if (gemiIds.length === 0) {
    console.log("No valid GEMI IDs to process.");
    return;
  }

  await runCrawlerForGemiIds(gemiIds, path.join(__dirname, "downloads"));
}

// Check if the script is being run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("An unexpected error occurred in main:", err.message);
  });
}
