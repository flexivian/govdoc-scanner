import crypto from "crypto";
import axios from "axios";
import mime from "mime-types";
import path from "path";
import fs from "fs";

// Default HTTP headers for requests
export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

// Create common HTTP headers
export function createHttpHeaders(referer = null) {
  return {
    "User-Agent": DEFAULT_USER_AGENT,
    ...(referer && { Referer: referer }),
  };
}

// Calculate MD5 hash of buffer data
export function calculateHash(buffer) {
  const hashSum = crypto.createHash("md5");
  hashSum.update(buffer);
  return hashSum.digest("hex");
}

// Download file content as buffer from remote URL
export async function downloadFileBuffer(url, options = {}) {
  const { userAgent = DEFAULT_USER_AGENT, referer, timeout = 120000 } = options;

  const response = await axios({
    method: "GET",
    url: url,
    responseType: "arraybuffer",
    headers: createHttpHeaders(referer),
    timeout: timeout,
  });

  return Buffer.from(response.data);
}

// Create safe filename by sanitizing input and adding date prefix
export function createSafeFilename(name, datePrefix = "") {
  const sanitized = name.split("?")[0] || "file"; // Remove query parameters
  return datePrefix + sanitized;
}

// Check if file exists with any of the given extensions
export function findExistingFileWithExtensions(
  basePath,
  extensions = [".pdf", ".doc", ".docx"]
) {
  for (const ext of extensions) {
    const potentialPath = basePath + ext;
    if (fs.existsSync(potentialPath)) {
      return potentialPath;
    }
  }
  return null;
}

// Validate GEMI ID format (numbers only)
export function isValidGemiId(gemiId) {
  if (!gemiId || typeof gemiId !== "string") return false;
  return /^\d+$/.test(gemiId.trim());
}

// Resolve filename conflicts by appending numbers
export function resolveFilenameConflict(basePath, extension) {
  let finalPath = basePath + extension;
  let counter = 1;

  while (fs.existsSync(finalPath)) {
    finalPath = `${basePath}_(${counter++})${extension}`;
  }

  return finalPath;
}

// Parse DD/MM/YYYY date format and convert to YYYY-MM-DD prefix for filenames
export function parseDateToFilePrefix(dateText) {
  if (!dateText) return "";

  const dateMatch = dateText.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    return `${year}-${month}-${day}_`;
  }
  return "";
}

// Get file extension from HTTP response headers
export function getFileExtensionFromHeaders(headers) {
  let ext = "";

  // Try Content-Disposition first
  const cd = headers["content-disposition"];
  if (cd) {
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/.exec(cd);
    if (m) {
      ext = path.extname(m[1]).toLowerCase();
    }
  }

  // Fallback to Content-Type
  if (!ext && headers["content-type"]) {
    const ctype = headers["content-type"].toLowerCase();
    if (ctype.includes("pdf")) {
      ext = ".pdf";
    } else if (ctype.includes("msword")) {
      ext = ".doc";
    } else if (ctype.includes("openxmlformats")) {
      ext = ".docx";
    } else {
      const guess = mime.extension(ctype);
      if (guess) ext = "." + guess;
    }
  }

  return ext;
}
