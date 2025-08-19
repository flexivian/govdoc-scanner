---
sidebar_position: 3
---

# Doc-Scanner Examples

The doc-scanner application processes documents (PDF, DOC, DOCX) to extract comprehensive metadata with chronological processing, intelligent representative tracking, and automatic change detection using Gemini 2.5 Flash Lite.

## Basic Usage

### Process Documents Interactively

```bash
# 1. Place documents in input directory (name with date prefixes)
mkdir -p apps/doc-scanner/src/data/input/123204604000
cp /path/to/documents/2019-09-23_document.pdf apps/doc-scanner/src/data/input/123204604000/
cp /path/to/documents/2020-11-03_report.pdf apps/doc-scanner/src/data/input/123204604000/

# 2. Run the scanner
npm start scanner
# Enter GEMI ID: 123204604000

# 3. Find comprehensive results in output directory
ls apps/doc-scanner/src/data/output/123204604000/
```

## Tracked Changes Feature

The scanner automatically detects and summarizes significant changes between document versions:

### Example Output with Tracked Changes

```json
{
  "123204604000": {
    "company-name": "ΠΑΡΑΔΕΙΓΜΑ ΑΕ",
    "metadata": {
      "current-snapshot": {
        "tracked_changes": "• ΠΑΠΑΔΟΠΟΥΛΟΣ ΙΩΑΝΝΗΣ appointed as Διαχειριστής • ΚΩΝΣΤΑΝΤΙΝΟΥ ΜΑΡΙΑ increased ownership to 45%"
      }
    },
    "tracked-changes": {
      "2019-09-23_initial.pdf": "Initial company registration document",
      "2020-11-03_amendment.pdf": "• ΠΑΠΑΔΟΠΟΥΛΟΣ ΙΩΑΝΝΗΣ appointed as Διαχειριστής",
      "2021-12-13_transfer.pdf": "• ΚΩΝΣΤΑΝΤΙΝΟΥ ΜΑΡΙΑ increased ownership to 45% • Company address changed to ΛΕΩΦΟΡΟΣ ΚΗΦΙΣΙΑΣ 200"
    }
  }
}
```

## Incremental Processing

The system includes intelligent processing optimization that avoids reprocessing documents:

```bash
# First run - processes all documents
npm start scanner
# Enter GEMI ID: 123204604000
# Output: Processing 3 file(s)...

# Second run - skips processing (no new files)
npm start scanner
# Enter GEMI ID: 123204604000
# Output: ✓ No processing needed. All documents are up to date.

# Adding new document triggers incremental processing
cp /path/to/2022-06-15_new.pdf apps/doc-scanner/src/data/input/123204604000/
npm start scanner
# Enter GEMI ID: 123204604000
# Output: Found 1 new file(s) to process: 2022-06-15_new.pdf
```

## Programmatic Usage

### Process Files for a Company

```javascript
import fs from "fs";
import { processCompanyFiles } from "./apps/doc-scanner/src/processing-logic.mjs";
import { getMetadataModel } from "./apps/doc-scanner/src/gemini-config.mjs";

async function processCompany(gemiId, inputDir, outputDir) {
  const model = getMetadataModel();
  const files = fs
    .readdirSync(inputDir)
    .filter((f) => /\.(pdf|docx?)$/i.test(f));

  const result = await processCompanyFiles(
    files,
    inputDir,
    outputDir,
    gemiId,
    model
  );

  if (result.status !== "success") {
    throw new Error(result.error || "Processing failed");
  }
  return result.finalMetadata;
}

// Usage
await processCompany(
  "123204604000",
  "apps/doc-scanner/src/data/input/123204604000",
  "apps/doc-scanner/src/data/output/123204604000"
);
```

### Check Processing Requirements

Use the metadata checker to determine if processing is needed:

```javascript
import { checkExistingMetadata } from "./apps/doc-scanner/src/metadata-checker.mjs";
import fs from "fs";

function getInputFiles(inputFolder) {
  return fs
    .readdirSync(inputFolder)
    .filter(
      (file) =>
        file.endsWith(".pdf") || file.endsWith(".docx") || file.endsWith(".doc")
    );
}

async function checkProcessingNeeded(gemiId, inputDir, outputDir) {
  const inputFiles = getInputFiles(inputDir);
  const processCheck = checkExistingMetadata(gemiId, outputDir, inputFiles);

  console.log(`Check result: ${processCheck.reason}`);

  if (!processCheck.shouldProcess) {
    console.log("✓ No processing needed. All documents are up to date.");
    return { needsProcessing: false, files: [] };
  }

  console.log(`Processing ${processCheck.filesToProcess.length} file(s)...`);
  return {
    needsProcessing: true,
    files: processCheck.filesToProcess,
  };
}

// Usage
const { needsProcessing, files } = await checkProcessingNeeded(
  "123204604000",
  "./input/123204604000",
  "./output/123204604000"
);

if (needsProcessing) {
  // Process only the files that need processing
  const result = await processCompanyFiles(
    files, // Only new/updated files
    "./input/123204604000",
    "./output/123204604000",
    "123204604000",
    getMetadataModel()
  );
}
```

### Batch Document Processing

```javascript
import fs from "fs";
import path from "path";
import { processCompanyFiles } from "./apps/doc-scanner/src/processing-logic.mjs";
import { getMetadataModel } from "./apps/doc-scanner/src/gemini-config.mjs";

async function batchProcessCompanies(companiesDir, outputDir) {
  const model = getMetadataModel();
  const gemiIds = fs.readdirSync(companiesDir);
  const results = [];

  for (const gemiId of gemiIds) {
    const inputDir = path.join(companiesDir, gemiId);
    const outDir = path.join(outputDir, gemiId);
    const files = fs
      .readdirSync(inputDir)
      .filter((f) => /\.(pdf|docx?)$/i.test(f));

    try {
      const res = await processCompanyFiles(
        files,
        inputDir,
        outDir,
        gemiId,
        model
      );
      results.push({ gemiId, status: res.status });
    } catch (e) {
      results.push({ gemiId, status: "error", error: e.message });
    }
  }

  return results;
}

await batchProcessCompanies(
  "apps/doc-scanner/src/data/input",
  "apps/doc-scanner/src/data/output"
);
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

```json
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
```

## Configuration

### Custom Gemini Settings

```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

export function getCustomModel(options = {}) {
  const {
  modelName = "gemini-2.5-flash-lite",
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

### Optimized Model Parameters

The doc-scanner uses optimized parameters for structured data extraction to ensure consistent, deterministic output:

```javascript
const config = {
  responseMimeType: "application/json",
  responseSchema: CompanyEssentialMetadata,

  temperature: 0.1,
  topK: 1,
  topP: 0.8,
};
```

**Parameter Explanations:**

- **`temperature: 0.1`**: Controls randomness in token selection during response generation. Lower temperatures (0.0-0.3) are ideal for structured data extraction as they produce more deterministic, consistent outputs. A temperature of 0 is completely deterministic, always selecting the highest probability token.
- **`topK: 1`**: Limits token selection to the top K most probable tokens. Setting `topK: 1` implements greedy decoding, always selecting the single most probable token at each step, ensuring maximum consistency for structured outputs.
- **`topP: 0.8`**: Uses nucleus sampling - selects from the smallest set of tokens whose cumulative probability exceeds the topP threshold. For example, if tokens have probabilities [0.4, 0.3, 0.2, 0.1], `topP: 0.8` would consider only the first three tokens (0.4+0.3+0.1=0.8), excluding the least probable option for more focused responses.

### Environment Configuration

See Reference > Configuration for all supported environment variables. Minimum required:

```bash
GEMINI_API_KEY=your_api_key_here
```

## Tips

- Ensure Gemini API key is valid and has sufficient quota
- **Important**: Name files with date prefixes (YYYY-MM-DD) for chronological processing
- Monitor API usage to avoid rate limits (using Gemini 2.5 Flash Lite)
- Check file permissions for input/output directories
- Documents are processed chronologically to track company evolution
- Large documents may take longer to process (5-20 seconds each)
