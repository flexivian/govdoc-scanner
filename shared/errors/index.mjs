export class GovDocError extends Error {
  constructor(message, code = "UNKNOWN_ERROR", details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class DocumentDownloadError extends GovDocError {
  constructor(message, url = null) {
    super(message, "DOCUMENT_DOWNLOAD_ERROR", { url });
  }
}

export class GeminiAPIError extends GovDocError {
  constructor(message, apiResponse = null) {
    super(message, "GEMINI_API_ERROR", { apiResponse });
  }
}

export class BrowserAutomationError extends GovDocError {
  constructor(message, step = null) {
    super(message, "BROWSER_AUTOMATION_ERROR", { step });
  }
}

export class FileProcessingError extends GovDocError {
  constructor(message, filePath = null) {
    super(message, "FILE_PROCESSING_ERROR", { filePath });
  }
}

export class ValidationError extends GovDocError {
  constructor(message, field = null) {
    super(message, "VALIDATION_ERROR", { field });
  }
}
