import { config } from "./index.mjs";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Validate configuration on startup and provide meaningful error messages
 */
export function validateConfig() {
  const errors = [];

  // Check required environment variables
  if (!config.api.gemini.apiKey) {
    errors.push(
      "GEMINI_API_KEY is required but not set in environment variables"
    );
  }

  // Validate URL format
  try {
    new URL(config.crawler.baseUrl);
  } catch {
    errors.push(`GEMI_BASE_URL is not a valid URL: ${config.crawler.baseUrl}`);
  }

  // Validate numeric ranges
  const numericValidations = [
    {
      value: config.api.gemini.maxAttempts,
      name: "GEMINI_MAX_ATTEMPTS",
      min: 1,
      max: 10,
    },
    {
      value: config.api.gemini.timeoutMs,
      name: "GEMINI_TIMEOUT_MS",
      min: 1000,
      max: 300000,
    },
    {
      value: config.api.gemini.initialDelayMs,
      name: "GEMINI_INITIAL_DELAY_MS",
      min: 100,
      max: 60000,
    },
    {
      value: config.api.gemini.maxBackoffDelayMs,
      name: "GEMINI_MAX_BACKOFF_DELAY_MS",
      min: 1000,
      max: 300000,
    },
    {
      value: config.crawler.pageLoadTimeoutMs,
      name: "PAGE_LOAD_TIMEOUT_MS",
      min: 5000,
      max: 300000,
    },
    {
      value: config.crawler.downloadTimeoutMs,
      name: "DOWNLOAD_TIMEOUT_MS",
      min: 10000,
      max: 600000,
    },
  ];

  for (const { value, name, min, max } of numericValidations) {
    if (isNaN(value)) {
      errors.push(
        `${name} must be a valid number, got: ${process.env[name] || "undefined"}`
      );
    } else if (value < min || value > max) {
      errors.push(`${name} must be between ${min} and ${max}, got: ${value}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`
    );
  }

  return true;
}

/**
 * Test API connectivity with the configured Gemini API key
 */
export async function validateApiKey(timeoutMs = config.api.gemini.timeoutMs) {
  if (!config.api.gemini.apiKey) {
    return {
      ok: false,
      reason: "GEMINI_API_KEY is not configured",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(config.api.gemini.apiKey);
    const model = genAI.getGenerativeModel({
      model: config.api.gemini.modelName,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Low-cost endpoint to validate auth
      await model.countTokens({
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        signal: controller.signal,
      });
      clearTimeout(timer);
      return { ok: true };
    } catch (err) {
      clearTimeout(timer);
      const status = err?.status || err?.response?.status;
      const msg = String(err?.message || "").toLowerCase();

      if (
        status === 401 ||
        status === 403 ||
        msg.includes("api key") ||
        msg.includes("unauthorized") ||
        msg.includes("permission")
      ) {
        return {
          ok: false,
          reason: `Gemini API authorization failed (${status || "unknown"})`,
        };
      }

      // Network or transient errors: don't block execution
      return {
        ok: true,
        warning: err?.message,
      };
    }
  } catch (e) {
    // Library/init error; proceed but warn
    return {
      ok: true,
      warning: e?.message,
    };
  }
}

/**
 * Return configuration schema and documentation
 */
export function getConfigSchema() {
  return {
    description: "GovDoc Scanner Configuration Schema",
    categories: {
      api: {
        description: "API-related configurations",
        variables: {
          GEMINI_API_KEY: {
            required: true,
            description: "Google Gemini API key for document processing",
            example: "your_api_key_here",
          },
          GEMINI_MODEL_NAME: {
            required: false,
            default: "gemini-2.5-flash-lite",
            description: "Gemini model name to use for processing",
          },
          GEMINI_MAX_ATTEMPTS: {
            required: false,
            default: 5,
            type: "number",
            range: "1-10",
            description: "Maximum retry attempts for Gemini API calls",
          },
          GEMINI_TIMEOUT_MS: {
            required: false,
            default: 5000,
            type: "number",
            range: "1000-300000",
            description:
              "Timeout for individual Gemini API calls (milliseconds)",
          },
        },
      },
      crawler: {
        description: "Web crawler configurations",
        variables: {
          GEMI_BASE_URL: {
            required: false,
            default: "https://publicity.businessportal.gr",
            description: "Base URL for the GEMI portal",
          },
          PAGE_LOAD_TIMEOUT_MS: {
            required: false,
            default: 60000,
            type: "number",
            range: "5000-300000",
            description: "Page load timeout for crawler (milliseconds)",
          },
          DOWNLOAD_TIMEOUT_MS: {
            required: false,
            default: 120000,
            type: "number",
            range: "10000-600000",
            description: "Document download timeout (milliseconds)",
          },
          CRAWLER_MAX_RETRIES: {
            required: false,
            default: 3,
            type: "number",
            range: "1-10",
            description: "Maximum retry attempts for failed downloads",
          },
          CRAWLER_HEADLESS: {
            required: false,
            default: true,
            type: "boolean",
            description:
              "Run browser in headless mode (true) or with GUI (false)",
          },
        },
      },
      processing: {
        description: "Processing and performance configurations",
        variables: {
          OUTPUT_DIR: {
            required: false,
            default: "./output",
            description: "Directory for output files",
          },
        },
      },
    },
  };
}
