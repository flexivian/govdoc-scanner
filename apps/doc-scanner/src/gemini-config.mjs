import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Always load .env from the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../../");
dotenv.config({ path: path.resolve(projectRoot, ".env") });

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const GEMINI_METADATA_MODEL_NAME = "gemini-2.5-flash-lite-preview-06-17";

// Retry configuration constants
const MAX_GEMINI_ATTEMPTS = 5;
const INITIAL_GEMINI_DELAY_MS = 3000;
const MAX_BACKOFF_DELAY_MS = 60000;
const JITTER_WITH_SUGGESTED_DELAY_MS = 3000;
const JITTER_WITHOUT_SUGGESTED_DELAY_MS = 1000;

// Return model for metadata extraction
export function getMetadataModel() {
  return genAI.getGenerativeModel({ model: GEMINI_METADATA_MODEL_NAME });
}

// Format prompt for Gemini API depending on input type
function formatPrompt(promptOrParts) {
  if (Array.isArray(promptOrParts)) {
    return [
      {
        role: "user",
        parts: promptOrParts.map((part) =>
          typeof part === "string" ? { text: part } : part
        ),
      },
    ];
  } else if (typeof promptOrParts === "string") {
    return [{ role: "user", parts: [{ text: promptOrParts }] }];
  } else {
    const error = new Error(
      "Invalid promptOrParts structure for generateContent"
    );
    error.status = 400;
    throw error;
  }
}

// Delay utility
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Determine if the error is eligible for retry
function isRetryableError(error) {
  const msg = error.message?.toLowerCase() || "";
  return (
    error.status === 429 ||
    error.status === 503 ||
    msg.includes("rate limit") ||
    msg.includes("overloaded") ||
    msg.includes("service unavailable")
  );
}

// Extract retry delay from Gemini API error if available
function extractSuggestedDelay(error) {
  if (Array.isArray(error.errorDetails)) {
    const retryInfo = error.errorDetails.find(
      (detail) =>
        detail && detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
    );

    if (retryInfo?.retryDelay) {
      if (typeof retryInfo.retryDelay.seconds === "number") {
        let ms = retryInfo.retryDelay.seconds * 1000;
        if (typeof retryInfo.retryDelay.nanos === "number") {
          ms += Math.floor(retryInfo.retryDelay.nanos / 1_000_000);
        }
        return ms;
      }

      if (typeof retryInfo.retryDelay === "string") {
        const delaySeconds = parseInt(
          retryInfo.retryDelay.replace("s", ""),
          10
        );
        if (!isNaN(delaySeconds)) {
          return delaySeconds * 1000;
        }
      }
    }
  }

  return 0;
}

// Main retry logic for calling Gemini model
export async function callGeminiWithRetry(
  modelInstance,
  promptOrParts,
  fileIdentifier,
  generationConfig,
  maxAttempts = MAX_GEMINI_ATTEMPTS,
  initialDelayMs = INITIAL_GEMINI_DELAY_MS
) {
  let attempts = 0;
  let delayMs = initialDelayMs;
  let lastError = null;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const request = {
        contents: formatPrompt(promptOrParts),
        generationConfig,
      };

      const result = await modelInstance.generateContent(request);
      return await result.response.text();
    } catch (error) {
      lastError = error;

      const retryable = isRetryableError(error);

      if (retryable && attempts < maxAttempts) {
        const suggestedDelay = extractSuggestedDelay(error);
        const jitter = Math.floor(
          Math.random() *
            (suggestedDelay > 0
              ? JITTER_WITH_SUGGESTED_DELAY_MS
              : JITTER_WITHOUT_SUGGESTED_DELAY_MS)
        );
        const waitMs = (suggestedDelay || delayMs) + jitter;

        console.warn(
          `Retrying (${attempts}/${maxAttempts}) for ${fileIdentifier} after ${(
            waitMs / 1000
          ).toFixed(1)}s... (${error.message})`
        );

        await delay(waitMs);

        delayMs =
          suggestedDelay > 0
            ? initialDelayMs
            : Math.min(delayMs * 2, MAX_BACKOFF_DELAY_MS);
      } else {
        console.error(
          `Gemini call failed for ${fileIdentifier} (attempt ${attempts}): ${error.message}`
        );

        if (retryable && attempts >= maxAttempts) {
          error.isRateLimitExhaustion = true;
        }

        error.originalStatus = error.status;
        throw error;
      }
    }
  }

  // If all retries failed, throw a final error
  const finalError = new Error(
    `Failed to call Gemini for ${fileIdentifier} after ${maxAttempts} attempts. Last error: ${lastError?.message}`
  );
  finalError.status = lastError?.status || 503;
  finalError.isRateLimitExhaustion = true;
  finalError.isRetryExhaustion = true;
  finalError.cause = lastError;

  if (lastError?.originalStatus) {
    finalError.originalStatus = lastError.originalStatus;
  }

  throw finalError;
}
