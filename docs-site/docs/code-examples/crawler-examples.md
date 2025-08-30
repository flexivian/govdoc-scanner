---
sidebar_position: 2
---

# Crawler Examples

The crawler application handles searching for companies and downloading their documents from the GEMI portal.

## Basic Usage

### Interactive Search

```bash
npm start crawler
# Select: "Search for companies"
# Enter company name: "ALPHA BANK"
# Apply filters as needed
# Results saved to ~/.govdoc/crawler/search-results.gds
```

### Direct Download by GEMI ID

```bash
npm start crawler
# Select: "Download documents by GEMI ID"
# Option 1: Enter single ID: 123204604000
# Option 2: Provide file path with multiple IDs
```

## Programmatic Usage

### Download Documents for Specific IDs

```javascript
// From a script in the repo root
import { runCrawlerForGemiIds } from "./apps/crawler/src/id_crawler.mjs";
import { createLogger } from "./shared/logging/index.mjs";
import { validateConfig, validateApiKey } from "./shared/config/validator.mjs";

const logger = createLogger("CRAWLER-SCRIPT");

async function downloadDocuments(gemiIds, outputDir) {
  try {
    // Validate configuration first
    validateConfig();
    const apiResult = await validateApiKey();
    if (!apiResult.ok) {
      logger.error(`API validation failed: ${apiResult.reason}`);
      throw new Error(`API validation failed: ${apiResult.reason}`);
    }

    logger.info(`Starting download for ${gemiIds.length} companies`);
    const results = await runCrawlerForGemiIds(gemiIds, outputDir);
    logger.info("Download completed successfully");
    return results;
  } catch (error) {
    logger.error("Download failed", error);
    throw error;
  }
}

// Usage
const gemiIds = ["123204604000", "144340502000"];
const results = await downloadDocuments(gemiIds, "./downloads");
```

### Batch Processing with File Input

```bash
# Create input file
echo "123204604000" > company-ids.txt
echo "144340502000" >> company-ids.txt

# Run crawler with file
npm start crawler
# Select file option and provide path
```

## Output Structure

Downloaded documents are organized with date prefixes for chronological processing:

```
~/.govdoc/crawler/downloads/
├── 123204604000/
│   └── document_downloads/
│       ├── 2019-09-23_90189.pdf
│       ├── 2020-11-03_2334237.pdf
│       └── 2021-12-13_2747556.pdf
└── 144340502000/
    └── document_downloads/
        └── 2019-01-17_77417.pdf
```

## Search Features

### Company Name Search

- Fuzzy matching with "Did you mean?" suggestions
- Support for Greek and Latin characters
- Filter by legal form, status, and location

### Advanced Filters

- Legal form (AE, EPE, OE, etc.)
- Company status (Active, Inactive, etc.)
- Registration date ranges
- Geographic location

## Common Use Cases

### Research Workflow

```bash
# 1. Search for companies
npm start crawler
# Search for: "TELECOMMUNICATIONS"
# Apply filters: Active companies only

# 2. Review .gds results (saved in crawler working directory)
cat ~/.govdoc/crawler/search-results.gds

# 3. Download documents for selected IDs
npm start crawler
# Use file option with filtered IDs
```

### Bulk Download

```bash
# Prepare large ID list (JSON format)
cat > bulk-companies.gds << EOF
["123204604000", "144340502000", "148851015000", "152034008000"]
EOF

# Run bulk download
npm start crawler
# Select file option
# Enter: bulk-companies.gds
```

## Error Handling

The crawler handles common issues automatically with proper logging:

```javascript
import { createLogger } from "./shared/logging/index.mjs";
import {
  DocumentDownloadError,
  BrowserAutomationError,
} from "./shared/errors/index.mjs";

const logger = createLogger("CRAWLER-ERROR-HANDLER");

// Example error handling in crawler operations
async function safeDownload(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.debug(`Download attempt ${attempt}/${retries} for ${url}`);
      const result = await downloadFile(url);
      logger.info(`✅ Successfully downloaded ${url}`);
      return result;
    } catch (error) {
      logger.warn(`⚠️ Attempt ${attempt} failed for ${url}: ${error.message}`);

      if (attempt === retries) {
        logger.error(`❌ All ${retries} attempts failed for ${url}`, error);
        throw new DocumentDownloadError(
          `Failed after ${retries} attempts`,
          url
        );
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

Built-in error handling includes:

- Network timeouts with retry logic and enhanced reliability
- Rate limiting with exponential backoff
- Invalid document formats (skipped with logging)
- Browser crashes (automatic restart with error tracking)
- Failed downloads with robust retry mechanism and detailed logging

## Tips

- Use specific company names for better search results
- Check `.gds` files before bulk downloading
- Monitor disk space for large batch downloads
- Files are automatically named with date prefixes for chronological processing
- Re-running downloads is safe - existing files will be automatically skipped
- Stable internet connection recommended for best results
