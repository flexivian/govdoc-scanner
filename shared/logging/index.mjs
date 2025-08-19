import config from "../config/index.mjs";

// Global progress manager reference
let globalProgressManager = null;

export class Logger {
  constructor(module = "SYSTEM") {
    this.module = module;
    this.config = config.logging;
  }

  // Check if progress is currently active
  isProgressActive() {
    return globalProgressManager && globalProgressManager.isActive;
  }

  // Critical: Use stderr to avoid cli-progress conflicts
  error(message, error = null) {
    const timestamp = new Date().toISOString();
    const errorInfo = error ? `\nStack: ${error.stack || error.message}` : "";
    const logMessage = `\n[${timestamp}] [ERROR] [${this.module}] ${message}${errorInfo}\n`;

    // Errors should always be shown immediately, even during progress
    if (this.isProgressActive()) {
      globalProgressManager.showError(`[ERROR] [${this.module}] ${message}`);
    } else {
      process.stderr.write(logMessage);
    }
  }

  warn(message) {
    if (this.config.level <= 2) {
      const timestamp = new Date().toISOString();
      const logMessage = `\n[${timestamp}] [WARN] [${this.module}] ${message}\n`;

      // Try to buffer warn messages during progress, otherwise output immediately
      if (
        !this.isProgressActive() ||
        !globalProgressManager.bufferLog("stderr", logMessage)
      ) {
        process.stderr.write(logMessage);
      }
    }
  }

  info(message) {
    if (this.config.level <= 1 && !this.config.suppressInfo) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [INFO] [${this.module}] ${message}\n`;

      // Try to buffer info messages during progress, otherwise output immediately
      if (
        !this.isProgressActive() ||
        !globalProgressManager.bufferLog("stdout", logMessage)
      ) {
        process.stdout.write(logMessage);
      }
    }
  }

  debug(message) {
    if (this.config.level === 0) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [DEBUG] [${this.module}] ${message}\n`;

      // Try to buffer debug messages during progress, otherwise output immediately
      if (
        !this.isProgressActive() ||
        !globalProgressManager.bufferLog("stdout", logMessage)
      ) {
        process.stdout.write(logMessage);
      }
    }
  }

  // Special method for logging during progress operations
  progressError(message, error = null) {
    // Always show errors, even during progress
    this.error(message, error);
  }
}

export const createLogger = (module) => new Logger(module);

// Function to set the global progress manager reference
export const setGlobalProgressManager = (progressManager) => {
  globalProgressManager = progressManager;
};
