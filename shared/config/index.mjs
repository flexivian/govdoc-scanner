import dotenv from "dotenv";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

// Always load .env from the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../");
dotenv.config({ path: path.resolve(projectRoot, ".env") });

// Environment-aware configuration loader
export const config = {
  api: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      modelName: process.env.GEMINI_MODEL_NAME || "gemini-2.5-flash-lite",
      maxAttempts: parseInt(process.env.GEMINI_MAX_ATTEMPTS || "5"),
      initialDelayMs: parseInt(process.env.GEMINI_INITIAL_DELAY_MS || "3000"),
      maxBackoffDelayMs: parseInt(
        process.env.GEMINI_MAX_BACKOFF_DELAY_MS || "60000"
      ),
      timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || "5000"),
      jitterWithSuggestedDelayMs: parseInt(
        process.env.GEMINI_JITTER_WITH_SUGGESTED_DELAY_MS || "3000"
      ),
      jitterWithoutSuggestedDelayMs: parseInt(
        process.env.GEMINI_JITTER_WITHOUT_SUGGESTED_DELAY_MS || "1000"
      ),
    },
  },
  crawler: {
    baseUrl: process.env.GEMI_BASE_URL || "https://publicity.businessportal.gr",
    pageLoadTimeoutMs: parseInt(process.env.PAGE_LOAD_TIMEOUT_MS || "60000"),
    downloadTimeoutMs: parseInt(process.env.DOWNLOAD_TIMEOUT_MS || "120000"),
    userAgent:
      process.env.USER_AGENT ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    maxRetries: parseInt(process.env.CRAWLER_MAX_RETRIES || "3"),
    headless: process.env.CRAWLER_HEADLESS !== "false",
  },
  processing: {
    outputDir: process.env.OUTPUT_DIR || "./output",
  },
  workingDir: {
    base: process.env.WORKING_DIR || path.join(projectRoot, ".govdoc"),
    crawler: process.env.WORKING_DIR ? path.join(process.env.WORKING_DIR, "crawler") : path.join(projectRoot, ".govdoc", "crawler"),
    docScanner: process.env.WORKING_DIR ? path.join(process.env.WORKING_DIR, "doc-scanner") : path.join(projectRoot, ".govdoc", "doc-scanner"),
    cli: process.env.WORKING_DIR ? path.join(process.env.WORKING_DIR, "cli") : path.join(projectRoot, ".govdoc", "cli"),
  },
  logging: {
    level:
      process.env.LOG_LEVEL === "debug"
        ? 0
        : process.env.LOG_LEVEL === "info"
          ? 1
          : process.env.LOG_LEVEL === "warn"
            ? 2
            : 3, // error only
    suppressInfo: false, // Set to true during progress operations
  },
};

export default config;
