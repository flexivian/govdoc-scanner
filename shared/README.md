# Shared Infrastructure

This directory contains the core infrastructure components used across all GovDoc Scanner applications and modules.

## Directory Structure

```
shared/
├── config/
│   ├── index.mjs     # Configuration loader and environment variables
│   └── validator.mjs # Configuration validation and API testing
├── errors/
│   └── index.mjs     # Structured error classes
├── logging/
│   └── index.mjs     # Progress-aware logging system
└── progress/
    └── index.mjs     # Progress bar management with log buffering
```

## Environment Configuration

The shared configuration system loads environment variables from a `.env` file in your project root.

Create a `.env` file in your project root directory and add your configuration values. You can copy the provided `.env.example` file as a starting point:

```bash
cp .env.example .env
```

Then edit the `.env` file with your actual configuration values.

### Log Levels

```bash
LOG_LEVEL=debug    # All messages
LOG_LEVEL=info     # Info, warn, error
LOG_LEVEL=warn     # Warn and error only
LOG_LEVEL=error    # Error only (default)
```

### Environment Variables

#### API Configuration

```bash
GEMINI_API_KEY=your_api_key_here                # Required: Google Gemini API key
GEMINI_MODEL_NAME=gemini-2.5-flash-lite         # AI model to use for document processing
GEMINI_MAX_ATTEMPTS=5                           # Maximum retry attempts for API calls
GEMINI_INITIAL_DELAY_MS=3000                    # Initial delay before retrying failed calls
GEMINI_MAX_BACKOFF_DELAY_MS=60000               # Maximum backoff delay for retries
GEMINI_TIMEOUT_MS=5000                          # Timeout for individual API calls
GEMINI_JITTER_WITH_SUGGESTED_DELAY_MS=3000      # Jitter when API suggests delay
GEMINI_JITTER_WITHOUT_SUGGESTED_DELAY_MS=1000   # Jitter for general retry delays
```

#### Crawler Configuration

```bash
GEMI_BASE_URL=https://publicity.businessportal.gr              # Base URL for the Greek business portal
PAGE_LOAD_TIMEOUT_MS=60000                                     # Timeout for page loads
DOWNLOAD_TIMEOUT_MS=120000                                     # Timeout for document downloads
USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36  # Browser user agent string
CRAWLER_MAX_RETRIES=3                                          # Maximum retry attempts for downloads
CRAWLER_HEADLESS=true                                          # Run browser in headless mode (true/false)
```

#### Processing Configuration

```bash
OUTPUT_DIR=./output     # Directory for processed output files
```

## Components

### Configuration Management

Environment-based configuration system with validation.

**Features:**

- Environment variable-based configuration
- Configuration validation at startup
- API key connectivity testing
- Centralized settings for all modules

**Usage:**

```javascript
import config from "../shared/config/index.mjs";
import { validateConfig, validateApiKey } from "../shared/config/validator.mjs";

// Access configuration
const { apiKey, modelName } = config.api.gemini;
const { baseUrl, headless } = config.crawler;
const { level } = config.logging;

// Validate at startup
validateConfig();
const apiResult = await validateApiKey();
```

### Error Handling

Structured error classes for consistent error handling.

**Available Error Classes:**

- `GovDocError` - Base error class with context
- `DocumentDownloadError` - Download failures
- `GeminiAPIError` - AI API errors
- `BrowserAutomationError` - Web automation errors
- `FileProcessingError` - File processing errors
- `ValidationError` - Input validation errors

**Usage:**

```javascript
import {
  DocumentDownloadError,
  GeminiAPIError,
} from "../shared/errors/index.mjs";

throw new DocumentDownloadError("Failed to download PDF", url);
throw new GeminiAPIError("API rate limit exceeded", apiResponse);
```

### Logging System

Progress-aware logging with automatic buffering.

**Features:**

- Log levels: debug, info, warn, error
- Module-specific loggers with timestamps
- Automatic log buffering during progress operations
- Clean terminal output without interference

**Usage:**

```javascript
import { createLogger } from "../shared/logging/index.mjs";

const logger = createLogger("MODULE-NAME");

logger.debug("Debugging information");
logger.info("Status messages");
logger.warn("Warning messages");
logger.error("Error messages", errorObject);
```

**Progress-Aware Behavior:**

- Logs are automatically buffered during progress operations
- Buffered logs display after progress completion
- Critical errors appear immediately
- Works with all log levels automatically

### Progress Management

Progress bars with automatic log buffering.

**Features:**

- Progress tracking with ETA calculations
- Automatic log buffering during operations
- Clean terminal management
- Error display without disrupting progress

**Usage:**

```javascript
import { ProgressManager } from "../shared/progress/index.mjs";
import { createLogger } from "../shared/logging/index.mjs";

const progress = new ProgressManager("Processing files");
const logger = createLogger("PROCESSOR");

progress.start(totalFiles);

for (let i = 0; i < totalFiles; i++) {
  logger.info(`Processing file ${i}`); // Automatically buffered
  await processFile(files[i]);
  progress.update(i + 1);
}

progress.complete("All files processed successfully!");
```
