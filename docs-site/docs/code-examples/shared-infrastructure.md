---
sidebar_position: 4
---

# Shared Infrastructure

Core modules shared across apps, located under `shared/`. These provide configuration management, logging, progress tracking, and error handling.

## Configuration

Access centralized configuration loaded from environment variables:

```javascript
import config from "../../shared/config/index.mjs";

// Access different configuration sections
const { api, crawler, processing, logging } = config;

// Example usage
console.log(`Using Gemini model: ${config.api.gemini.modelName}`);
console.log(`Output directory: ${config.processing.outputDir}`);
console.log(`Crawler headless mode: ${config.crawler.headless}`);
```

### Configuration Validation

Validate configuration at application startup:

```javascript
import {
  validateConfig,
  validateApiKey,
} from "../../shared/config/validator.mjs";

try {
  // Validate all configuration values
  validateConfig();
  console.log("✅ Configuration validated successfully");

  // Test API connectivity
  const apiResult = await validateApiKey();
  if (!apiResult.ok) {
    console.error(`❌ API validation failed: ${apiResult.reason}`);
    process.exit(1);
  }

  if (apiResult.warning) {
    console.warn(`⚠️ API warning: ${apiResult.warning}`);
  }
} catch (error) {
  console.error(`❌ Configuration Error: ${error.message}`);
  process.exit(1);
}
```

## Logging

Create module-specific loggers with automatic progress-aware buffering:

```javascript
import { createLogger } from "../../shared/logging/index.mjs";

const logger = createLogger("MY-MODULE");

// Log at different levels (filtered by LOG_LEVEL environment variable)
logger.debug("Detailed debugging information");
logger.info("General information messages");
logger.warn("Warning messages");
logger.error("Error messages", optionalErrorObject);

// Logs are automatically buffered during progress operations
// and displayed after progress completion
```

### Real-world Logging Example

```javascript
import { createLogger } from "../../shared/logging/index.mjs";
import { progressManager } from "../../shared/progress/index.mjs";
import { setGlobalProgressManager } from "../../shared/logging/index.mjs";

// Setup logging with progress integration
setGlobalProgressManager(progressManager);
const logger = createLogger("FILE-PROCESSOR");

async function processFiles(files) {
  logger.info(`Starting to process ${files.length} files`);

  const progressBar = progressManager.createBar(files.length, {
    format: "Processing |{bar}| {percentage}% | {value}/{total} | {status}",
  });

  for (let i = 0; i < files.length; i++) {
    // These logs are automatically buffered during progress
    logger.debug(`Processing file: ${files[i].name}`);

    try {
      await processFile(files[i]);
      logger.info(`✅ Successfully processed ${files[i].name}`);
    } catch (error) {
      // Errors are shown immediately, even during progress
      logger.error(`❌ Failed to process ${files[i].name}`, error);
    }

    progressManager.update(i + 1, `Processed ${files[i].name}`);
  }

  progressManager.stop(); // Automatically flushes all buffered logs
  logger.info("File processing completed");
}
```

## Progress Manager

Display progress bars with automatic log buffering:

```javascript
import { progressManager } from "../../shared/progress/index.mjs";

// Create and start progress bar
const bar = progressManager.createBar(10);

for (let i = 1; i <= 10; i++) {
  // Simulate work
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Update progress with current value and status
  progressManager.update(i, `Processing step ${i}`);
}

// Stop progress bar and flush any buffered logs
progressManager.stop();
```

### Advanced Progress Management

```javascript
import { progressManager } from "../../shared/progress/index.mjs";
import { createLogger } from "../../shared/logging/index.mjs";
import { setGlobalProgressManager } from "../../shared/logging/index.mjs";

// Setup progress-aware logging
setGlobalProgressManager(progressManager);
const logger = createLogger("DOWNLOADER");

async function downloadFiles(urls) {
  const progressBar = progressManager.createBar(urls.length, {
    format: "Downloading |{bar}| {percentage}% | {value}/{total} | {status}",
    barCompleteChar: "█",
    barIncompleteChar: "░",
  });

  for (let i = 0; i < urls.length; i++) {
    try {
      await downloadFile(urls[i]);
      logger.info(`✅ Downloaded ${urls[i]}`); // Automatically buffered during progress
      progressManager.update(i + 1, `Downloaded ${urls[i]}`);
    } catch (error) {
      // Errors bypass buffering and show immediately
      logger.error(`❌ Failed to download ${urls[i]}`, error);
      progressManager.update(i + 1, `Failed: ${urls[i]}`);
    }
  }

  progressManager.stop(); // Flushes all buffered logs
}
```

## Error Handling

Use structured error classes for consistent error handling:

```javascript
import {
  GovDocError,
  DocumentDownloadError,
  GeminiAPIError,
  BrowserAutomationError,
  FileProcessingError,
  ValidationError,
} from "../../shared/errors/index.mjs";

// Base error with context
throw new GovDocError("Something went wrong", "CUSTOM_CODE", { userId: 123 });

// Specific error types
throw new DocumentDownloadError(
  "Failed to download PDF",
  "https://example.com/file.pdf"
);
throw new GeminiAPIError("API rate limit exceeded", apiResponseObject);
throw new BrowserAutomationError("Failed to click button", "login-step");
throw new FileProcessingError("Cannot read PDF", "/path/to/file.pdf");
throw new ValidationError("Invalid GEMI ID format", "gemiId");
```

### Error Handling in Practice

```javascript
import { DocumentDownloadError, createLogger } from "../../shared/index.mjs";

const logger = createLogger("DOWNLOADER");

async function downloadDocument(url) {
  try {
    logger.debug(`Attempting to download: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      const error = new DocumentDownloadError(
        `HTTP ${response.status}: ${response.statusText}`,
        url
      );
      logger.error(`Download failed for ${url}`, error);
      throw error;
    }

    logger.info(`✅ Successfully downloaded ${url}`);
    return await response.blob();
  } catch (error) {
    if (error instanceof DocumentDownloadError) {
      logger.error(`Download failed for ${error.details.url}`, error);
      throw error; // Re-throw with context preserved
    } else {
      // Convert unknown errors to structured errors
      const structuredError = new DocumentDownloadError(error.message, url);
      logger.error(`Unexpected error during download`, structuredError);
      throw structuredError;
    }
  }
}
```

## Complete Integration Example

Here's how to properly initialize and use all shared infrastructure components:

```javascript
import config from "../../shared/config/index.mjs";
import {
  validateConfig,
  validateApiKey,
} from "../../shared/config/validator.mjs";
import {
  createLogger,
  setGlobalProgressManager,
} from "../../shared/logging/index.mjs";
import { progressManager } from "../../shared/progress/index.mjs";
import { GovDocError } from "../../shared/errors/index.mjs";

async function initializeApplication() {
  // 1. Validate configuration
  try {
    validateConfig();
  } catch (error) {
    // Use console.error for initialization errors before logger is set up
    console.error(`❌ Configuration Error: ${error.message}`);
    process.exit(1);
  }

  // 2. Test API connectivity
  const apiResult = await validateApiKey();
  if (!apiResult.ok) {
    console.error(`❌ API Error: ${apiResult.reason}`);
    process.exit(1);
  }

  // 3. Setup logging with progress integration
  setGlobalProgressManager(progressManager);
  const logger = createLogger("MY-APP");

  logger.info("Application initialized successfully");
  logger.info(`Using model: ${config.api.gemini.modelName}`);
  logger.info(`Output directory: ${config.processing.outputDir}`);

  if (apiResult.warning) {
    logger.warn(`API Warning: ${apiResult.warning}`);
  }

  return { logger, config };
}

async function main() {
  const { logger, config } = await initializeApplication();

  try {
    // Your application logic here
    await runApplication();
  } catch (error) {
    if (error instanceof GovDocError) {
      logger.error(
        `Application error [${error.code}]: ${error.message}`,
        error
      );
    } else {
      logger.error("Unexpected error:", error);
    }
    process.exit(1);
  }
}

main();
```

See [Configuration](../installation/Configuration.md) for full details on environment variables.
