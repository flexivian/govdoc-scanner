---
sidebar_position: 1
---

# CLI Examples

This section provides simple examples for using the GovDoc Scanner CLI tool - the recommended way to use the project.

The CLI tool provides the complete end-to-end workflow, combining crawling and document processing automatically with both interactive and command-line modes.

### Basic Usage

**Interactive Mode (Recommended):**

```bash
npm start govdoc
# Follow interactive prompts:
# 1. Choose input method (file, manual, random)
# 2. Enter or select companies
# 3. Confirm processing
# 4. Watch automated crawling and processing
```

**Command Line Mode for Automation:**

```bash
# Process from file
npm start govdoc -- --input ./companies.gds

# Process random companies
npm start govdoc -- --company-random 10

# Show help
npm start govdoc -- --help
```

### Programmatic Usage

**Simple Integration:**

```javascript
import { spawn } from "child_process";
import { createLogger } from "./shared/logging/index.mjs";
import { validateConfig, validateApiKey } from "./shared/config/validator.mjs";

const logger = createLogger("GOVDOC-INTEGRATION");

async function processCompanies(inputFilePath) {
  try {
    // Validate configuration before starting
    validateConfig();
    const apiResult = await validateApiKey();
    if (!apiResult.ok) {
      logger.error(`API validation failed: ${apiResult.reason}`);
      throw new Error(`API validation failed: ${apiResult.reason}`);
    }

    logger.info("Starting GovDoc processing...");

    return new Promise((resolve, reject) => {
      const govdoc = spawn("npm", [
        "start",
        "govdoc",
        "--",
        "--input",
        inputFilePath, // JSON file with an array of GEMI IDs, e.g. ["152034008000","175175703000"]
      ]);

      govdoc.stdout.on("data", (data) => {
        logger.debug(`GovDoc output: ${data}`);
      });

      govdoc.stderr.on("data", (data) => {
        logger.warn(`GovDoc stderr: ${data}`);
      });

      govdoc.on("close", (code) => {
        if (code === 0) {
          logger.info("✅ GovDoc processing completed successfully");
          resolve();
        } else {
          logger.error(`❌ GovDoc processing failed with exit code: ${code}`);
          reject(new Error(`Failed with exit code: ${code}`));
        }
      });
    });
  } catch (error) {
    logger.error("Failed to start GovDoc processing", error);
    throw error;
  }
}
```

### Output Structure

After processing, you'll find results in the `output/` directory:

```
output/
├── 123204604000/
│   ├── 123204604000_final_metadata.json  # Comprehensive company metadata
│   └── document_downloads/
│       ├── 2019-09-23_90189.pdf
│       └── 2020-11-03_2334237.pdf
└── govdoc-output.json  # Summary of all processed companies
```

## Individual Applications

For specific use cases, you can use individual applications:

- **[Crawler Examples](./crawler-examples.md)** - Web scraping and document downloading
- **[Doc-Scanner Examples](./doc-scanner-examples.md)** - Document processing and metadata extraction

## Next Steps

- Check the [Getting Started](../installation/Getting%20Started.md) guide for setup
- Explore [Development Setup](../installation/Development.md) for advanced usage
- Review the [GSoC 2025 Overview](../gsoc/2025/overview.md) for project roadmap
