import { chromium } from "playwright";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import mime from "mime-types";

// ES Module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://publicity.businessportal.gr";
const PAGE_LOAD_TIMEOUT_IN_MILLISECONDS = 60000;
const DOWNLOAD_TIMEOUT_AXIOS = 120000;

// Downloads a document using Axios
async function downloadWithAxios(documentUrl, outputPath) {
  try {
    const response = await axios({
      method: "GET",
      url: documentUrl,
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: BASE_URL,
      },
      timeout: DOWNLOAD_TIMEOUT_AXIOS,
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", cleanupAndReject);
      response.data.on("error", cleanupAndReject);

      function cleanupAndReject(err) {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
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
  const selector = 'a[href^="/api/download/"]';
  const seen = new Set();
  const downloadLinks = [];

  for (const el of $(selector).toArray()) {
    const rel = $(el).attr("href");
    if (!rel || seen.has(rel)) continue;
    seen.add(rel);

    const fullUrl = BASE_URL + rel;
    let name = rel.split("/").pop().split("?")[0] || `file_${seen.size}`;
    let ext = path.extname(name).toLowerCase();

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

    if (!ext) {
      // do a byte‐range GET to get headers
      let headers = {};
      try {
        const resp = await axios.get(fullUrl, {
          responseType: "stream",
          headers: {
            "User-Agent": "...",
            Referer: BASE_URL,
            Range: "bytes=0-0",
          },
          timeout: DOWNLOAD_TIMEOUT_AXIOS,
        });
        headers = resp.headers;
        resp.data.destroy();
      } catch (err) {
        console.error(`Could not fetch headers for ${fullUrl}: ${err.message}`);
      }

      // Try Content-Disposition
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

      name += ext;
    }

    // Add date prefix to the filename if we found a date
    const baseFileName = datePrefix + name;

    // avoid overwrites
    let out = path.join(downloadDir, baseFileName);
    let i = 1;
    while (fs.existsSync(out)) {
      const base = path.basename(baseFileName, ext);
      out = path.join(downloadDir, `${base}_(${i++})${ext}`);
    }

    downloadLinks.push({ url: fullUrl, path: out, sourceUrl: rel });
  }

  return { downloadLinks, downloadDir };
}

// Downloads all the extracted document links
async function downloadAll(documentLinks) {
  let downloadedCount = 0;

  for (const documentInfo of documentLinks) {
    try {
      await downloadWithAxios(documentInfo.url, documentInfo.path);
      downloadedCount++;
    } catch (err) {
      console.error(
        `Failed to download document from ${documentInfo.sourceUrl}: ${err.message}`
      );
    }
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
      throw new Error(
        `Company with GEMI ID ${gemiId} not found. Please check the ID or try again later.`
      );
    }

    try {
      // Wait for the page to load and the modification history to appear
      await page.waitForSelector("div#ModificationHistory", { timeout: 2000 });
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
    } else {
      console.log("No Documents found to download.");
    }
  } catch (error) {
    console.error(`Error processing GEMI ID ${gemiId}: ${error.message}`);
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
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });

    for (const [index, gemiId] of gemiIds.entries()) {
      console.log(
        `\n--- CRAWLER: Processing ${index + 1}/${
          gemiIds.length
        }: ${gemiId} ---`
      );

      // Construct the final, desired download path
      const gemiDownloadPath = path.join(
        outputBaseDir,
        gemiId,
        "document_downloads"
      );

      // Pass the final path to the fetcher
      await fetchCompanyDocuments(context, gemiId, gemiDownloadPath);
      finalDownloadPaths[gemiId] = gemiDownloadPath;
    }
  } catch (error) {
    console.error("A critical error occurred during crawling:", error);
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
