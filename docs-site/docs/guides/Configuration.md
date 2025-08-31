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

### Working Directory Configuration

Controls where application outputs are stored:

- **WORKING_DIR** (default: ./.govdoc): Base directory for all app outputs
  - Creates organized subdirectories: `.govdoc/crawler/`, `.govdoc/doc-scanner/`, `.govdoc/cli/`
  - Use absolute path or ~ for home directory if desired

### System Configuration

Controls logging and system behavior:

- **LOG_LEVEL** (default: error): Logging level (debug, info, warn, error)

### OpenSearch Integration (Optional)

Controls data indexing and search functionality:

- **OPENSEARCH_PUSH** (default: false): Enable pushing data to OpenSearch
- **OPENSEARCH_URL**: OpenSearch endpoint URL
- **OPENSEARCH_USERNAME**: OpenSearch username
- **OPENSEARCH_PASSWORD**: OpenSearch password
- **OPENSEARCH_INDEX**: OpenSearch index name
- **OPENSEARCH_INSECURE** (default: false): Allow insecure SSL connections
- **OPENSEARCH_BATCH_SIZE** (default: 500): Batch size for bulk operations
- **OPENSEARCH_INDEX_STRATEGY** (default: static): Index strategy (static/dynamic)
- **OPENSEARCH_REFRESH** (default: false): Force refresh after operations

## Configuration Validation

The application automatically validates configuration on startup and provides detailed error messages for invalid or missing values. It also tests API connectivity with the configured Gemini API key.

## Common Configuration Scenarios

### Development Setup

For development with verbose logging:

- Set `LOG_LEVEL=debug` for detailed debugging information
- Set `CRAWLER_HEADLESS=false` to show browser for debugging

## Need Help?

If you encounter any configuration issues, check out our [Troubleshooting Guide](./Troubleshooting.md) for common problems and solutions.
