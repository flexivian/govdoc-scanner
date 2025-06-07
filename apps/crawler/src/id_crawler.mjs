import puppeteer from "puppeteer";
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

// Downloads a PDF file using Axios with proper headers and error handling
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
function extractPdfLinks(html, gemiId) {
  const $ = cheerio.load(html);
  const downloadDir = path.join(__dirname, "downloads", `${gemiId}`);
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

    // Minimal sanitization
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

// Main workflow to handle a GEMI ID's PDF extraction
async function fetchCompanyPdfs(browser, gemiId) {
  const companyPageUrl = `${BASE_URL}/company/${gemiId}`;
  let page = null; // Use a single page for this company

  try {
    // Open a new page (tab) for this company
    page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    console.log(`Navigating to company page: ${companyPageUrl}`);
    await page.goto(companyPageUrl, {
      waitUntil: "networkidle2",
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

    console.log("Extracting PDF links...");
    const html = await page.content();
    const { pdfLinks, downloadDir } = extractPdfLinks(html, gemiId);

    if (pdfLinks.length > 0) {
      console.log(`Found ${pdfLinks.length} PDF(s) to download.`);
      console.log(`Saving PDFs to: ${downloadDir}`);
      console.log("Starting downloads...");

      const downloadedCount = await downloadAllPdfs(pdfLinks);
      console.log(
        `Downloaded ${downloadedCount} PDF(s) out of ${pdfLinks.length}.`
      );
    } else {
      console.log("No PDF files found to download.");
    }
  } catch (error) {
    console.error(`Error processing GEMI ID ${gemiId}: ${error.message}`);
  } finally {
    // Close the page after processing, but leave the browser open.
    if (page) {
      await page.close();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf("--id");
  const fileIndex = args.indexOf("--file");

  let gemiIds = [];

  // Argument parsing
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
      const idsFromFile = JSON.parse(fileContent);
      if (!Array.isArray(idsFromFile)) {
        throw new Error("JSON file must contain an array of GEMI numbers.");
      }
      gemiIds = idsFromFile
        .map((id) => String(id).trim())
        .filter((id) => /^\d+$/.test(id));
      console.log(`Loaded ${gemiIds.length} valid GEMI IDs from ${filePath}`);
    } catch (e) {
      console.error(`Error reading or parsing ${filePath}:`, e.message);
      return;
    }
  } else {
    console.log(
      "This script should be run via the terminal_ui.mjs controller."
    );
    return;
  }

  if (gemiIds.length === 0) {
    console.log("No valid GEMI IDs to process.");
    return;
  }

  // --- Browser Management Logic ---
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    console.log(`\nStarting crawl for ${gemiIds.length} company/companies...`);
    for (const [index, gemiId] of gemiIds.entries()) {
      console.log(
        `\n--- Processing ${index + 1} of ${gemiIds.length}: ${gemiId} ---`
      );
      // Pass the single browser instance to the worker function
      await fetchCompanyPdfs(browser, gemiId);
    }
  } catch (error) {
    console.error(
      "A critical error occurred during the browser session:",
      error
    );
  } finally {
    // Ensure the browser is closed at the very end, no matter what.
    if (browser) {
      console.log("\n--- All processing complete. Closing browser. ---");
      await browser.close();
    }
  }
}

// Run main function and handle unexpected errors
main().catch((err) => {
  console.error("An unexpected error occurred in main:", err.message);
});
