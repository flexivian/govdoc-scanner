import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import readlineSync from "readline-sync";
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

// Initializes Puppeteer and returns the page instance
async function launchBrowserAndNavigate(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--no-zygote",
      "--disable-extensions",
    ],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );
  await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: PAGE_LOAD_TIMEOUT_PUPPETEER,
  });

  try {
    await page.waitForSelector("div#ModificationHistory", { timeout: 15000 });
  } catch {
    // Continue if selector is not found
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { browser, page };
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
async function fetchCompanyPdfs(gemiId) {
  const companyPageUrl = `${BASE_URL}/company/${gemiId}`;
  let browser = null;

  try {
    console.log(`Navigating to company page: ${companyPageUrl}`);
    const result = await launchBrowserAndNavigate(companyPageUrl);
    browser = result.browser;

    console.log("Extracting PDF links...");
    const html = await result.page.content();
    const { pdfLinks, downloadDir } = extractPdfLinks(html, gemiId);

    console.log(`Found ${pdfLinks.length} PDF(s) to download.`);
    if (pdfLinks.length > 0) {
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
    if (browser) {
      if (browser) await browser.close();
    }
  }
}

// CLI entry point
async function main() {
  const gemiIdInput = readlineSync.question("Enter GEMI ID: ");
  const gemiId = gemiIdInput ? gemiIdInput.trim() : "";

  if (!/^\d+$/.test(gemiId)) {
    console.error("Invalid GEMI ID format. Please enter numbers only.");
    return;
  }

  await fetchCompanyPdfs(gemiId);
}

// Run main function and handle unexpected errors
main().catch((err) => {
  console.error("An unexpected error occurred in main:", err.message);
});
