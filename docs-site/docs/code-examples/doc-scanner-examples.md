---
sidebar_position: 3
---

# Doc-Scanner Examples

The doc-scanner application processes documents (PDF, DOC, DOCX) to extract comprehensive metadata with chronological processing and intelligent representative tracking using Gemini 2.5 Flash.

## Basic Usage

### Process Documents Interactively

```bash
# 1. Place documents in input directory (name with date prefixes)
mkdir -p apps/doc-scanner/src/data/input/123204604000
cp /path/to/documents/2019-09-23_document.pdf apps/doc-scanner/src/data/input/123204604000/
cp /path/to/documents/2020-11-03_report.pdf apps/doc-scanner/src/data/input/123204604000/

# 2. Run the scanner
npx nx run doc-scanner:start
# Enter GEMI ID: 123204604000

# 3. Find comprehensive results in output directory
ls apps/doc-scanner/src/data/output/123204604000/
```

## Programmatic Usage

### Process Single Document

```javascript
import { processCompanyFiles } from "./apps/doc-scanner/src/processing-logic.mjs";
import { getMetadataModel } from "./apps/doc-scanner/src/gemini-config.mjs";

async function processDocument(gemiId, inputDir, outputDir) {
  const model = getMetadataModel();

  try {
    const result = await processCompanyFiles(
      gemiId,
      inputDir,
      outputDir,
      model
    );

    if (result.status === "success") {
      console.log("Processing successful:", result.finalMetadata);
      return result.finalMetadata;
    } else {
      console.error("Processing failed:", result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("Error processing documents:", error);
    throw error;
  }
}

// Usage
const result = await processDocument(
  "123204604000",
  "./input/123204604000",
  "./output/123204604000"
);
```

### Batch Document Processing

```javascript
import fs from "fs/promises";
import path from "path";
import { processCompanyFiles } from "./apps/doc-scanner/src/processing-logic.mjs";
import { getMetadataModel } from "./apps/doc-scanner/src/gemini-config.mjs";

async function batchProcessCompanies(companiesDir, outputDir) {
  const companies = await fs.readdir(companiesDir);
  const model = getMetadataModel();

  const results = [];

  for (const gemiId of companies) {
    const companyInputDir = path.join(companiesDir, gemiId);
    const companyOutputDir = path.join(outputDir, gemiId);

    try {
      const result = await processCompanyFiles(
        gemiId,
        companyInputDir,
        companyOutputDir,
        model
      );
      results.push({
        gemiId,
        status: result.status,
        data: result.finalMetadata,
      });
    } catch (error) {
      results.push({
        gemiId,
        status: "error",
        error: error.message,
      });
    }
  }

  return results;
}

// Usage
const results = await batchProcessCompanies("./input", "./output");
```

## Output Structure

Processed documents generate a single comprehensive metadata file:

```
apps/doc-scanner/src/data/output/123204604000/
└── 123204604000_final_metadata.json  # Complete company metadata merged chronologically
```

## Supported Document Types

- **PDF**: Company registration, financial reports
- **DOCX**: Modern Word documents
- **DOC**: Legacy Word documents

## Extracted Metadata

Each processed company produces comprehensive JSON with enhanced schema:

````json
{
  "123204604000": {
    "company-name": "ALPHA BANK AE",
    "company-tax-id": "123456789",
    "creation-date": "2019-09-23",
    "scan-date": "2024-01-15T00:00:00.000Z",
    "metadata": {
      "current-snapshot": {
        "gemi_id": "123204604000",
        "company_tax_id": "123456789",
        "company_name": "ALPHA BANK AE",
        "representatives": [
          {
            "capital_share": "50,000.00 Ευρώ / 50%",
            "is_active": true,
            "name": "ΠΑΠΑΔΟΠΟΥΛΟΣ ΙΩΑΝΝΗΣ",
            "role": "Διαχειριστής",
            "tax_id": "987654321"
          }
        ],
        "registered_address": "Stadiou 40, Athens, 10564",
        "company_type": "AE",
        "competent_gemi_office": null,
        "region": null,
        "city": "Athens",
        "postal_code": "10564",
        "document_date": "2019-09-23"
      }
    }
  }
}

## Configuration

### Custom Gemini Settings

```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

export function getCustomModel(options = {}) {
  const {
    modelName = "gemini-2.5-flash-lite-preview-06-17",
    temperature = 0.1,
    maxTokens = 8192,
  } = options;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
    },
  });
}
````

### Environment Configuration

```bash
# .env settings for doc-scanner
GEMINI_API_KEY=your_api_key_here
GEMINI_CONCURRENCY_LIMIT=15
NODE_ENV=production
```

## Tips

- Ensure Gemini API key is valid and has sufficient quota
- **Important**: Name files with date prefixes (YYYY-MM-DD) for chronological processing
- Use appropriate concurrency limits (default: 15)
- Monitor API usage to avoid rate limits (using Gemini 2.5 Flash Lite)
- Check file permissions for input/output directories
- Documents are processed chronologically to track company evolution
- Large documents may take longer to process (5-20 seconds each)
