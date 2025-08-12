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
# Results saved to apps/crawler/src/ids.txt
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

async function downloadDocuments(gemiIds, outputDir) {
  try {
    const results = await runCrawlerForGemiIds(gemiIds, outputDir);
    console.log("Download results:", results);
    return results;
  } catch (error) {
    console.error("Download failed:", error);
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
apps/crawler/src/downloads/
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

# 2. Review ids.txt results (saved in crawler src directory)
cat apps/crawler/src/ids.txt

# 3. Download documents for selected IDs
npm start crawler
# Use file option with filtered IDs
```

### Bulk Download

```bash
# Prepare large ID list
cat > bulk-companies.txt << EOF
123204604000
144340502000
148851015000
152034008000
EOF

# Run bulk download
npm start crawler
# Select file option
# Enter: bulk-companies.txt
```

## Error Handling

The crawler handles common issues automatically:

- Network timeouts with retry logic and enhanced reliability
- Rate limiting with exponential backoff
- Invalid document formats (skipped)
- Browser crashes (automatic restart)
- Failed downloads with robust retry mechanism

## Tips

- Use specific company names for better search results
- Check `ids.txt` before bulk downloading
- Monitor disk space for large batch downloads
- Files are automatically named with date prefixes for chronological processing
- Re-running downloads is safe - existing files will be automatically skipped
- Stable internet connection recommended for best results
