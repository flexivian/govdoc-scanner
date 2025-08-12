# Configuration Management

This directory contains the centralized configuration management system for the GovDoc Scanner project.

## Overview

The configuration system eliminates hardcoded values throughout the codebase and provides a centralized, environment-aware configuration management solution.

## Usage

### Basic Import

```javascript
import { config } from "./shared/config/index.mjs";

// Use configuration values
const { baseUrl, pageLoadTimeoutMs } = config.crawler;
const { apiKey, maxAttempts } = config.api.gemini;
```

### Configuration Validation

```javascript
import { validateConfig, validateApiKey } from "./shared/config/validator.mjs";

// Validate all configuration
try {
  validateConfig();
  console.log("✅ Configuration is valid");
} catch (error) {
  console.error("❌ Configuration Error:", error.message);
  process.exit(1);
}

// Test API connectivity
const apiValidation = await validateApiKey();
if (!apiValidation.ok) {
  console.error("❌ API Key validation failed:", apiValidation.reason);
}
```

## Configuration Categories

### API Configuration (`config.api`)

Controls API-related settings, primarily for the Gemini AI service.

| Variable                      | Default                   | Description               |
| ----------------------------- | ------------------------- | ------------------------- |
| `GEMINI_API_KEY`              | _required_                | Google Gemini API key     |
| `GEMINI_MODEL_NAME`           | `"gemini-2.5-flash-lite"` | Model name for processing |
| `GEMINI_MAX_ATTEMPTS`         | `5`                       | Maximum retry attempts    |
| `GEMINI_TIMEOUT_MS`           | `5000`                    | API call timeout          |
| `GEMINI_INITIAL_DELAY_MS`     | `3000`                    | Initial retry delay       |
| `GEMINI_MAX_BACKOFF_DELAY_MS` | `60000`                   | Maximum backoff delay     |

### Crawler Configuration (`config.crawler`)

Controls web crawling behavior and timeouts.

| Variable               | Default                                 | Description             |
| ---------------------- | --------------------------------------- | ----------------------- |
| `GEMI_BASE_URL`        | `"https://publicity.businessportal.gr"` | Portal base URL         |
| `PAGE_LOAD_TIMEOUT_MS` | `60000`                                 | Page load timeout       |
| `DOWNLOAD_TIMEOUT_MS`  | `120000`                                | Download timeout        |
| `USER_AGENT`           | Mozilla string                          | Browser user agent      |
| `CRAWLER_MAX_RETRIES`  | `3`                                     | Download retry attempts |
| `CRAWLER_HEADLESS`     | `true`                                  | Run browser headless    |

### Processing Configuration (`config.processing`)

Controls processing behavior and output paths.

| Variable     | Default      | Description           |
| ------------ | ------------ | --------------------- |
| `OUTPUT_DIR` | `"./output"` | Output directory path |

## Environment Variables

Create a `.env` file in the project root with your configuration:

```bash
# API Configuration
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL_NAME=gemini-2.5-flash-lite
GEMINI_MAX_ATTEMPTS=5

# Crawler Configuration
GEMI_BASE_URL=https://publicity.businessportal.gr
PAGE_LOAD_TIMEOUT_MS=60000
DOWNLOAD_TIMEOUT_MS=120000
CRAWLER_HEADLESS=true

# Processing Configuration
OUTPUT_DIR=./output
```
