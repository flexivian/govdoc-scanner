---
sidebar_position: 2
---

# Crawler Examples

The crawler application handles searching for companies and downloading their documents from the GEMI portal.

## Basic Usage

### Interactive Search

```bash
npx nx run crawler:start
# Select: "Search for companies"
# Enter company name: "ALPHA BANK"
# Apply filters as needed
# Results saved to ids.txt
```

### Direct Download by GEMI ID

```bash
npx nx run crawler:start
# Select: "Download documents by GEMI ID"
# Option 1: Enter single ID: 123204604000
# Option 2: Provide file path with multiple IDs
```

## Programmatic Usage

### Download Documents for Specific IDs

````javascript
import { runCrawlerForGemiIds } from './apps/crawler/src/id_crawler.mjs';

async function downloadDocuments(gemiIds, outputDir) {
  try {
    const results = await runCrawlerForGemiIds(gemiIds, outputDir);
    console.log('Download results:', results);
    return results;
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

// Usage
const gemiIds = ['123204604000', '144340502000'];
const results = await downloadDocuments(gemiIds, './downloads');
### Batch Processing with File Input

```bash
# Create input file
echo "123204604000" > company-ids.txt
echo "144340502000" >> company-ids.txt

# Run crawler with file
npx nx run crawler:start
# Select file option and provide path
````

## Output Structure

Downloaded documents are organized as:

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
npx nx run crawler:start
# Search for: "TELECOMMUNICATIONS"
# Apply filters: Active companies only

# 2. Review ids.txt results
cat apps/crawler/ids.txt

# 3. Download documents for selected IDs
npx nx run crawler:start
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
npx nx run crawler:start
# Select file option
# Enter: bulk-companies.txt
```

## Error Handling

The crawler handles common issues automatically:

- Network timeouts with retry logic
- Rate limiting with exponential backoff
- Invalid document formats (skipped)
- Browser crashes (automatic restart)

## Tips

- Use specific company names for better search results
- Check `ids.txt` before bulk downloading
- Monitor disk space for large batch downloads
- Stable internet connection recommended for best results
