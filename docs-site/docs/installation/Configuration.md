---
sidebar_position: 3
---

# Configuration

GovDoc Scanner reads configuration from a `.env` file at the project root and exposes it via `shared/config/index.mjs`.

## Environment Setup

### 1. Create Configuration File

Copy the example file and edit with your settings:

```bash
cp .env.example .env
```

### 2. Required Configuration

**GEMINI_API_KEY** (Required)

```bash
GEMINI_API_KEY=your_api_key_here
```

Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Configuration Categories

### API Configuration

Controls AI document processing behavior:

- **GEMINI_API_KEY** (required): Google Gemini API key
- **GEMINI_MODEL_NAME** (default: gemini-2.5-flash-lite): AI model to use for document processing
- **GEMINI_MAX_ATTEMPTS** (default: 5, range: 1-10): Maximum retry attempts for API calls
- **GEMINI_INITIAL_DELAY_MS** (default: 3000, range: 100-60000): Initial delay before retrying failed calls
- **GEMINI_MAX_BACKOFF_DELAY_MS** (default: 60000, range: 1000-300000): Maximum backoff delay for retries
- **GEMINI_TIMEOUT_MS** (default: 5000, range: 1000-300000): Timeout for individual API calls
- **GEMINI_JITTER_WITH_SUGGESTED_DELAY_MS** (default: 3000): Jitter when API suggests delay
- **GEMINI_JITTER_WITHOUT_SUGGESTED_DELAY_MS** (default: 1000): Jitter for general retry delays

### Crawler Configuration

Controls web scraping and document downloading:

- **GEMI_BASE_URL** (default: https://publicity.businessportal.gr): Base URL for Greek business portal
- **PAGE_LOAD_TIMEOUT_MS** (default: 60000, range: 5000-300000): Page load timeout
- **DOWNLOAD_TIMEOUT_MS** (default: 120000, range: 10000-600000): Document download timeout
- **USER_AGENT** (default: Chrome UA string): Browser user agent string
- **CRAWLER_HEADLESS** (default: true): Run browser in headless mode (true/false)
- **CRAWLER_MAX_RETRIES** (default: 3, range: 1-10): Maximum retry attempts for downloads

### Processing Configuration

Controls output and processing behavior:

- **OUTPUT_DIR** (default: ./output): Directory for processed output files
- **LOG_LEVEL** (default: error): Logging level (debug, info, warn, error)

## Configuration Validation

The application automatically validates configuration on startup and provides detailed error messages for invalid or missing values. It also tests API connectivity with the configured Gemini API key.

See [Shared Infrastructure Examples](../code-examples/shared-infrastructure.md) for code examples on how to use configuration validation in your applications.

## Common Configuration Scenarios

### Development Setup

For development with verbose logging:

- Set `LOG_LEVEL=debug` for detailed debugging information
- Set `CRAWLER_HEADLESS=false` to show browser for debugging
- Use `OUTPUT_DIR=./dev-output` for separate development output

## Troubleshooting

### Common Issues

**❌ "GEMINI_API_KEY is required"**

- Ensure `.env` file exists in project root
- Verify API key is set correctly
- Check API key is valid at [Google AI Studio](https://aistudio.google.com/app/apikey)

**❌ "Configuration validation failed"**

- Check numeric values are within valid ranges
- Verify URL formats are correct
- Ensure boolean values are "true" or "false"

**❌ "API validation failed"**

- Test API key manually at Google AI Studio
- Check internet connectivity
- Verify API quotas and billing status

For code examples on configuration testing and validation, see [Shared Infrastructure Examples](../code-examples/shared-infrastructure.md).
