import { chromium } from "playwright";
import { existsSync, rmSync } from "fs";
import fs from "fs";
import path from "path";

// Configs
const USER_DATA_DIR = "./playwright_profile";
const URL = "https://publicity.businessportal.gr/";

function parseArgs() {
  const args = process.argv.slice(2);
  let searchTerm = ""; // Default search term if not provided
  const filters = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === "--term" && nextArg) {
      searchTerm = nextArg;
      i++; // Skip next arg
    } else if (arg.startsWith("--filter.")) {
      const key = arg.substring("--filter.".length);
      if (nextArg) {
        filters[key] = nextArg;
        i++; // Skip next arg
      }
    }
  }
  if (!searchTerm && Object.keys(filters).length === 0) {
    console.error("You must provide at least a search term or one filter.");
    process.exit(1);
  }
  return { searchTerm, filters };
}

async function main() {
  const { searchTerm, filters } = parseArgs();

  console.log("Starting the search script...");
  console.log(`Search Term: "${searchTerm}"`);
  console.log("Applying Filters:", filters);

  // Remove old browser profile for a clean session
  if (existsSync(USER_DATA_DIR)) {
    rmSync(USER_DATA_DIR, { recursive: true, force: true });
  }

  // Launch browser with custom viewport and user agent
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
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
    await equipFilters(page, filters);

    // Search and scrape results
    await performSearch(page, searchTerm);
    const allResults = await scrapeAllPages(page);

    console.log("\nFinal Search Results:");
    console.log(
      `\nSuccessfully scraped a total of ${allResults.length} companies from all pages.`
    );

    // Write results to ids.txt
    const filePath = path.resolve("ids.txt");

    fs.writeFileSync(filePath, "", "utf-8"); // Clear file first
    fs.writeFileSync(filePath, allResults.join("\n"), "utf-8");
    console.log("Results written to ids.txt");
  } catch (e) {
    console.error(`An error occurred in the script: ${e}`);
    process.exit(1);
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

  await page.waitForTimeout(1000);
  await page.keyboard.press("Enter"); // Trigger search

  // Wait for either results or "no results" message
  const noResultsSelector = "h6.MuiTypography-root.MuiTypography-h6.css-n6vizl";
  const nextPageButtonSelector = 'button[aria-label="Go to next page"]';

  const result = await Promise.race([
    page
      .waitForSelector(noResultsSelector, { timeout: 15000 })
      .then(() => "no-results")
      .catch(() => null),
    page
      .waitForSelector(nextPageButtonSelector, { timeout: 15000 })
      .then(() => "results")
      .catch(() => null),
  ]);

  if (result === "no-results") {
    console.log("No results found with these filters/search term.");
    throw new Error("No results found.");
  } else if (result === "results") {
    console.log("Initial results loaded.");
  } else {
    console.log("Timed out waiting for search results.");
    throw new Error("Timed out waiting for search results.");
  }
}

// Applies filter values based on provided config
async function equipFilters(page, filters) {
  console.log("Equipping filters...");
  const filterButtonSelector =
    "button.MuiButtonBase-root.MuiButton-root.MuiButton-textPrimary";

  await page.waitForSelector(filterButtonSelector);
  await page.click(filterButtonSelector);
  await page.waitForSelector("#mui-3");
  await page.waitForTimeout(1000);

  // legal_type, status, suspension, special, competent_office
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

  // Activity
  var selector = 'input[type="text"][placeholder="Δραστηριότητα"]';
  if (filters.activity && filters.activity !== "") {
    await page.click(selector);
    await page.fill(selector, filters.activity, { timeout: 5000 });

    const activityOptionSelector = `label[title="${filters.activity}"] input[type="checkbox"]`;
    await page.waitForSelector(activityOptionSelector, { timeout: 3000 });
    await page.waitForTimeout(300);
    await page.click(activityOptionSelector);

    const arrowTriggerSelector = "a.dropdown-trigger.arrow.top";
    await page.click(arrowTriggerSelector);
  }

  // Place
  selector = 'input[type="text"][placeholder="Περιοχή"]';
  if (filters.place && filters.place !== "") {
    await page.click(selector);
    await page.fill(selector, filters.place, { timeout: 5000 });

    const activityOptionSelector = `label[title="${filters.place}"] input[type="checkbox"]`;
    await page.waitForSelector(activityOptionSelector, { timeout: 3000 });
    await page.waitForTimeout(300);
    await page.click(activityOptionSelector);
    await page.click("#mui-12"); // Close the Places dropdown
  }

  // Date filters
  const dateFilters = [
    ["incorporation_start", "#mui-12", "incorporation_finish", "#mui-13"],
    ["closing_start", "#mui-14", "closing_finish", "#mui-15"],
    ["kak_change_start", "#mui-16", "kak_change_finish", "#mui-17"],
  ];

  for (const [
    startKey,
    startSelector,
    finishKey,
    finishSelector,
  ] of dateFilters) {
    if (filters[startKey] || filters[finishKey]) {
      if (filters[startKey]) {
        await page.fill(startSelector, filters[startKey], { timeout: 5000 });
      }
      if (filters[finishKey]) {
        await page.fill(finishSelector, filters[finishKey], { timeout: 5000 });
      }
    }
  }

  // City filter
  if (filters.city && filters.city !== "") {
    const citySelector = "#outlined-basic-label";
    await page.fill(citySelector, filters.city, { timeout: 5000 });
  }

  // TK filter
  if (filters.tk && filters.tk !== "") {
    const tkSelector = "#outlined-basic2-label";
    await page.fill(tkSelector, filters.tk, { timeout: 5000 });
  }

  await page.waitForTimeout(500);
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
      break;
    }

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
