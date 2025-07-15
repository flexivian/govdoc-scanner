---
sidebar_position: 3
---

# Doc-Scanner Examples

The doc-scanner application processes documents (PDF, DOC, DOCX) to extract metadata and generate contextual histories.

## Basic Usage

### Process Documents Interactively

```bash
# 1. Place documents in input directory
mkdir -p apps/doc-scanner/src/data/input/123204604000
cp /path/to/documents/*.pdf apps/doc-scanner/src/data/input/123204604000/

# 2. Run the scanner
npx nx run doc-scanner:start
# Enter GEMI ID: 123204604000

# 3. Find results in output directory
ls apps/doc-scanner/src/data/output/123204604000/
```

## Programmatic Usage

### Process Single Document

```javascript
import { processSingleFile } from "./apps/doc-scanner/src/processing-logic.mjs";
import { getMetadataModel } from "./apps/doc-scanner/src/gemini-config.mjs";

async function processDocument(filePath, outputDir, fileName) {
  const model = getMetadataModel();

  try {
    const result = await processSingleFile(
      filePath,
      outputDir,
      fileName,
      model
    );

    if (result.status === "success") {
      console.log("Processing successful:", result.data);
      return result.data;
    } else {
      console.error("Processing failed:", result.reason);
      throw new Error(result.reason);
    }
  } catch (error) {
    console.error("Error processing document:", error);
    throw error;
  }
}

// Usage
const result = await processDocument(
  "./input/document.pdf",
  "./output",
  "document.pdf"
);
```

### Batch Document Processing

```javascript
import fs from "fs/promises";
import path from "path";
import pLimit from "p-limit";
import { processSingleFile } from "./apps/doc-scanner/src/processing-logic.mjs";
import { getMetadataModel } from "./apps/doc-scanner/src/gemini-config.mjs";

async function batchProcessDocuments(inputDir, outputDir, concurrency = 5) {
  const files = await fs.readdir(inputDir);
  const documentFiles = files.filter((f) => /\.(pdf|docx?)$/i.test(f));

  const limit = pLimit(concurrency);
  const model = getMetadataModel();

  const tasks = documentFiles.map((file) =>
    limit(() =>
      processSingleFile(path.join(inputDir, file), outputDir, file, model)
    )
  );

  const results = await Promise.allSettled(tasks);
  return results.map((result, index) => ({
    file: documentFiles[index],
    result: result.status === "fulfilled" ? result.value : result.reason,
  }));
}

// Usage
const results = await batchProcessDocuments(
  "./input/123204604000",
  "./output/123204604000"
);
```

## Output Structure

Processed documents generate structured outputs:

```
apps/doc-scanner/src/data/output/123204604000/
├── document_metadata/
│   ├── document1.json
│   ├── document2.json
│   └── document3.json
└── 123204604000_contextual_document_histories.json
```

## Supported Document Types

- **PDF**: Company registration, financial reports
- **DOCX**: Modern Word documents
- **DOC**: Legacy Word documents

## Extracted Metadata

Each document produces structured JSON with:

```json
{
  "companyName": "ALPHA BANK AE",
  "legalForm": "AE",
  "registrationNumber": "000123456789",
  "documentType": "INCORPORATION_DOCUMENT",
  "documentDate": "2019-09-23",
  "address": {
    "street": "Stadiou 40",
    "city": "Athens",
    "postalCode": "10564"
  }
}
```

## Configuration

### Custom Gemini Settings

```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

export function getCustomModel(options = {}) {
  const {
    modelName = "gemini-2.0-flash-lite",
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
```

### Environment Configuration

```bash
# .env settings for doc-scanner
GEMINI_API_KEY=your_api_key_here
GEMINI_CONCURRENCY_LIMIT=15
NODE_ENV=production
```

## Tips

- Ensure Gemini API key is valid and has sufficient quota
- Use appropriate concurrency limits (default: 15)
- Monitor API usage to avoid rate limits
- Check file permissions for input/output directories
- Large documents may take longer to process (5-20 seconds each)
