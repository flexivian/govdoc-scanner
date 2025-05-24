import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const GEMINI_METADATA_MODEL_NAME = "gemini-2.0-flash";
export const GEMINI_HISTORY_MODEL_NAME = "gemini-2.0-flash";

export const MIME_TYPE_JSON = "application/json";

const MAX_GEMINI_ATTEMPTS = 5;
const INITIAL_GEMINI_DELAY_MS = 3000;
const MAX_BACKOFF_DELAY_MS = 60000;
const JITTER_WITH_SUGGESTED_DELAY_MS = 3000;
const JITTER_WITHOUT_SUGGESTED_DELAY_MS = 1000;

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callGeminiWithRetry(
  modelInstance,
  promptOrParts,
  fileIdentifier,
  generationConfig,
  maxAttempts = MAX_GEMINI_ATTEMPTS,
  initialDelayMs = INITIAL_GEMINI_DELAY_MS
) {
  let attempts = 0;
  let currentDelayMs = initialDelayMs;
  let lastError = null;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      let formattedContents;

      if (Array.isArray(promptOrParts)) {
        // This handles the case for multimodal input like [text, filePart]
        // It converts each element in promptOrParts into a valid Part object if it's a string.
        const parts = promptOrParts.map((part) => {
          if (typeof part === "string") {
            return { text: part };
          }
          return part; // Assumes it's already a valid Part object (e.g., filePart)
        });
        formattedContents = [{ role: "user", parts: parts }];
      } else if (typeof promptOrParts === "string") {
        // This handles the case for a simple text prompt
        formattedContents = [
          { role: "user", parts: [{ text: promptOrParts }] },
        ];
      } else {
        // Fallback for unexpected promptOrParts structure
        console.error("Invalid promptOrParts structure:", promptOrParts);
        const structureError = new Error(
          "Invalid promptOrParts structure for generateContent"
        );
        structureError.status = 400; // Indicate it's a client-side structuring issue
        throw structureError;
      }

      const request = {
        contents: formattedContents,
        generationConfig: generationConfig,
      };

      const result = await modelInstance.generateContent(request);
      return await result.response.text();
    } catch (error) {
      lastError = error;

      const isRetryableServerError =
        error.status === 429 ||
        error.status === 503 ||
        (error.message && error.message.includes("429")) ||
        (error.message && error.message.toLowerCase().includes("rate limit")) ||
        (error.message &&
          error.message.toLowerCase().includes("model is overloaded")) ||
        (error.message &&
          error.message.toLowerCase().includes("service unavailable"));

      if (isRetryableServerError && attempts < maxAttempts) {
        let suggestedDelayMs = 0;
        if (error.errorDetails && Array.isArray(error.errorDetails)) {
          const retryInfo = error.errorDetails.find(
            (detail) =>
              detail &&
              detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
          );
          if (retryInfo && retryInfo.retryDelay) {
            if (typeof retryInfo.retryDelay.seconds === "number") {
              suggestedDelayMs = retryInfo.retryDelay.seconds * 1000;
              if (typeof retryInfo.retryDelay.nanos === "number") {
                suggestedDelayMs += Math.floor(
                  retryInfo.retryDelay.nanos / 1000000
                );
              }
            } else if (typeof retryInfo.retryDelay === "string") {
              const delaySeconds = parseInt(
                retryInfo.retryDelay.replace("s", ""),
                10
              );
              if (!isNaN(delaySeconds) && delaySeconds > 0) {
                suggestedDelayMs = delaySeconds * 1000;
              }
            }
          }
        }

        const baseWaitMs =
          suggestedDelayMs > 0 ? suggestedDelayMs : currentDelayMs;
        const jitter = Math.floor(
          Math.random() *
            (suggestedDelayMs > 0
              ? JITTER_WITH_SUGGESTED_DELAY_MS
              : JITTER_WITHOUT_SUGGESTED_DELAY_MS)
        );
        const finalWaitMs = baseWaitMs + jitter;

        console.warn(
          `Gemini API server issue (status ${
            error.status || "N/A"
          }) for ${fileIdentifier} (attempt ${attempts}/${maxAttempts}). Retrying in ~${(
            finalWaitMs / 1000
          ).toFixed(1)}s... (${error.message})`
        );
        await delay(finalWaitMs);

        if (suggestedDelayMs === 0) {
          currentDelayMs = Math.min(currentDelayMs * 2, MAX_BACKOFF_DELAY_MS);
        } else {
          currentDelayMs = initialDelayMs;
        }
      } else {
        console.error(
          `Error calling Gemini for ${fileIdentifier} (attempt ${attempts}/${maxAttempts}): ${error.message}`
        );
        if (error.status && !error.originalStatus) {
          error.originalStatus = error.status;
        }
        // Attach isRateLimitExhaustion to the error object if it's relevant
        if (isRetryableServerError && attempts >= maxAttempts) {
          error.isRateLimitExhaustion = true;
        }
        throw error;
      }
    }
  }

  const lastErrorMessage = lastError
    ? lastError.message
    : "No specific error message from last attempt.";
  const exhaustionError = new Error(
    `Failed to call Gemini for ${fileIdentifier} after ${maxAttempts} attempts due to persistent server issues. Last attempt error: ${lastErrorMessage}`
  );
  exhaustionError.status = lastError ? lastError.status || 503 : 503;
  exhaustionError.isRateLimitExhaustion = true; // General flag for exhaustion of retries for server issues
  exhaustionError.isRetryExhaustion = true; // More specific flag
  if (lastError) {
    exhaustionError.cause = lastError;
    if (lastError.originalStatus) {
      exhaustionError.originalStatus = lastError.originalStatus;
    }
  }
  throw exhaustionError;
}

export function getMetadataModel() {
  return genAI.getGenerativeModel({
    model: GEMINI_METADATA_MODEL_NAME,
  });
}

export function getHistoryModel() {
  return genAI.getGenerativeModel({
    model: GEMINI_HISTORY_MODEL_NAME,
  });
}
