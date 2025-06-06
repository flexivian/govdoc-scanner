import { chromium } from "playwright";
import { existsSync, rmSync } from "fs";

// Configs
const SEARCH_TERM = "Α";
const USER_DATA_DIR = "./playwright_profile";
const URL = "https://publicity.businessportal.gr/";

async function main() {
  console.log("Starting the search script...");

  // Remove old browser profile for a clean session
  if (existsSync(USER_DATA_DIR)) {
    rmSync(USER_DATA_DIR, { recursive: true, force: true });
  }

  // Launch browser with custom viewport and user agent
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({
    viewport: {
      width: 1200 + Math.floor(Math.random() * 100),
      height: 800 + Math.floor(Math.random() * 100),
    },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    // Navigate to site
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    console.log(`Navigated to ${URL}`);

    // Wait for the page to be fully initialized
    console.log("Waiting for reCAPTCHA badge...");
    await page.waitForSelector("div.grecaptcha-badge", { timeout: 20000 });
    console.log("Page appears to be fully ready.");

    // Set filters and perform the search
    await equipFilters(page, {
      //legal_type: "ΑΕ",
      status: "Ενεργή",
      //suspension: "Οχι",
      special: "",
      competent_office: "ΕΠΙΜΕΛΗΤΗΡΙΟ ΑΡΤΑΣ",
    });

    // Search and scrape results
    await performSearch(page, SEARCH_TERM);
    const allResults = await scrapeAllPages(page);

    console.log("\nFinal Search Results:");
    console.log(
      `\nSuccessfully scraped a total of ${allResults.length} companies from all pages.`
    );
    console.log(allResults);
  } catch (e) {
    console.error(`An error occurred in the script: ${e}`);
  } finally {
    console.log("Closing browser.");
    await browser.close();
  }
}

// Fills the search box and triggers the search
async function performSearch(page, searchTerm) {
  console.log(`Performing search for: "${searchTerm}"`);
  const searchInputSelector = "#AutocompleteSearchItem";

  await page.waitForSelector(searchInputSelector);
  await page.click(searchInputSelector);

  await page.fill(searchInputSelector, searchTerm, { timeout: 5000 });
  console.log(`Typed "${searchTerm}".`);

  await page.waitForTimeout(1000);
  await page.keyboard.press("Enter"); // Trigger search

  console.log("Waiting for search results to load..");
  await page.waitForSelector('button[aria-label="Go to next page"]', {
    timeout: 15000,
  });
  console.log("Initial results loaded.");
}

// Applies filter values based on provided config
async function equipFilters(page, filters) {
  console.log("Equipping filters...");
  const filterButtonSelector =
    "button.MuiButtonBase-root.MuiButton-root.MuiButton-textPrimary";

  await page.waitForSelector(filterButtonSelector);
  await page.click(filterButtonSelector);
  console.log(" Clicked on 'Filters' button.");
  await page.waitForSelector("#mui-3");
  await page.waitForTimeout(1000);

  const filterSelectors = {
    legal_type: "#mui-3",
    status: "#mui-5",
    suspension: "#mui-7",
    special: "#mui-9",
    competent_office: "#mui-11",
  };

  // Loop through filters and set each one
  for (const [key, selector] of Object.entries(filterSelectors)) {
    if (filters[key] && filters[key] !== "") {
      await page.click(selector);
      await page.fill(selector, filters[key], { timeout: 5000 });

      const optionSelector = `${selector}-option-0`;
      await page.waitForSelector(optionSelector, { timeout: 3000 });
      await page.waitForTimeout(300);
      await page.click(optionSelector);
      await page.keyboard.press("Escape"); // Close dropdown
    }
  }
}

// Loops through result pages and extracts all company IDs
async function scrapeAllPages(page) {
  console.log("\nStarting multi-page scrape...");
  const allGemiNumbers = [];
  let pageNum = 1;

  const nextButtonSelector = 'button[aria-label="Go to next page"]';

  while (true) {
    console.log(`--- Scraping page ${pageNum} ---`);
    await page.waitForSelector("div.MuiPaper-root.MuiCard-root", {
      timeout: 10000,
    });

    const currentPageResults = await extractResults(page);
    console.log(`    Found ${currentPageResults.length} results on this page.`);
    allGemiNumbers.push(...currentPageResults);

    const nextButton = page.locator(nextButtonSelector).first();

    // Stop if no more pages
    if (await nextButton.isDisabled()) {
      console.log("'Next page' button is disabled. Reached the last page.");
      break;
    }

    console.log("'Next page' button is active. Clicking to proceed...");
    await nextButton.click();
    await page.waitForSelector(nextButtonSelector);

    pageNum++;
  }

  return allGemiNumbers;
}

// Extracts GEMI numbers from cards on the current page
async function extractResults(page) {
  console.log("Extracting GEMI numbers from current page...");
  const cardSelector = "div.MuiPaper-root.MuiCard-root";

  const cardLocators = await page.locator(cardSelector).all();
  const gemiNumbers = [];

  for (const card of cardLocators) {
    const linkElement = card.locator('a[href^="/company/"]');
    if ((await linkElement.count()) > 0) {
      const href = await linkElement.first().getAttribute("href");
      if (href) {
        const gemiNumber = href.split("/").pop();
        gemiNumbers.push(gemiNumber.trim());
      }
    }
  }

  // Remove duplicate first result
  if (gemiNumbers.length > 0) {
    gemiNumbers.shift();
  }
  return gemiNumbers;
}

main();
