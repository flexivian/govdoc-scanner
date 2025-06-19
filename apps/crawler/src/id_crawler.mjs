import { chromium } from "playwright";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

// ES Module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://publicity.businessportal.gr";
const PAGE_LOAD_TIMEOUT_PUPPETEER = 60000;
const PDF_DOWNLOAD_TIMEOUT_AXIOS = 120000;

// Downloads a PDF file using Axios
async function downloadPdfWithAxios(pdfUrl, outputPath) {
  try {
    const response = await axios({
      method: "GET",
      url: pdfUrl,
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: BASE_URL,
      },
      timeout: PDF_DOWNLOAD_TIMEOUT_AXIOS,
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

// Parses the HTML and extracts valid PDF download links
function extractPdfLinks(html, downloadDir) {
  const $ = cheerio.load(html);
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  const pdfLinks = [];
  const foundUrls = new Set();
  const linkSelector = 'a[href^="/api/download/"]';

  $(linkSelector).each((i, el) => {
    const $link = $(el);
    const relativePdfUrl = $link.attr("href");

    if (!relativePdfUrl || foundUrls.has(relativePdfUrl)) return;
    foundUrls.add(relativePdfUrl);

    const fullPdfUrl = BASE_URL + relativePdfUrl;
    let originalFilename =
      relativePdfUrl.split("/").pop().split("?")[0] ||
      `document_${foundUrls.size}`;
    if (!originalFilename.toLowerCase().endsWith(".pdf")) {
      originalFilename += ".pdf";
    }

    originalFilename = originalFilename.replace(/[\/\\:*?"<>|]/g, "_");

    let basePath = path.join(downloadDir, originalFilename);
    let outputPath = basePath;
    let count = 1;

    while (fs.existsSync(outputPath)) {
      const ext = path.extname(originalFilename);
      const base = path.basename(originalFilename, ext);
      outputPath = path.join(downloadDir, `${base}_(${count})${ext}`);
      count++;
    }

    pdfLinks.push({
      url: fullPdfUrl,
      path: outputPath,
      sourceUrl: relativePdfUrl,
    });
  });

  // Return pdfLinks and the confirmed downloadDir
  return { pdfLinks, downloadDir };
}

// Downloads all the extracted PDF links
async function downloadAllPdfs(pdfLinks) {
  let downloadedCount = 0;

  for (const pdfInfo of pdfLinks) {
    try {
      await downloadPdfWithAxios(pdfInfo.url, pdfInfo.path);
      downloadedCount++;
    } catch (err) {
      console.error(
        `Failed to download PDF from ${pdfInfo.sourceUrl}: ${err.message}`
      );
    }
  }

  return downloadedCount;
}

// Main workflow for a single ID
async function fetchCompanyPdfs(context, gemiId, downloadPath) {
  const companyPageUrl = `${BASE_URL}/company/${gemiId}`;
  let page = null;

  try {
    page = await context.newPage();
    await page.goto(companyPageUrl, {
      waitUntil: "networkidle",
      timeout: PAGE_LOAD_TIMEOUT_PUPPETEER,
    });

    try {
      // Wait for the page to load and the modification history to appear
      await page.waitForSelector("div#ModificationHistory", { timeout: 2000 });
    } catch {
      // If the modification history doesn't load:
      // No pdfs are available, so we can continue and find 0 or
      // pdfs exist but not under modification history
      // so we continue nonetheless
    }

    const html = await page.content();
    // Pass the final, desired download path directly to the extractor
    const { pdfLinks, downloadDir } = extractPdfLinks(html, downloadPath);

    if (pdfLinks.length > 0) {
      console.log(`Found ${pdfLinks.length} PDF(s). Saving to: ${downloadDir}`);
      await downloadAllPdfs(pdfLinks);
    } else {
      console.log("No PDF files found to download.");
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
        "pdf_downloads"
      );
      await fs.promises.mkdir(gemiDownloadPath, { recursive: true });

      // Pass the final path to the fetcher
      await fetchCompanyPdfs(context, gemiId, gemiDownloadPath);
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
