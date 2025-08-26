import fs from "fs/promises";
import path from "path";
import config from "../config/index.mjs";
import { createLogger } from "../logging/index.mjs";

const logger = createLogger("WORKDIR");

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - The directory path to ensure
 * @returns {Promise<void>}
 */
export async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      logger.debug(`Creating directory: ${dirPath}`);
      await fs.mkdir(dirPath, { recursive: true });
    } else {
      throw error;
    }
  }
}

/**
 * Get the working directory path for a specific app
 * @param {'crawler'|'docScanner'|'cli'} app - The app name
 * @returns {string} The working directory path
 */
export function getWorkingDir(app) {
  const workingDirs = {
    crawler: config.workingDir.crawler,
    docScanner: config.workingDir.docScanner,
    cli: config.workingDir.cli,
  };

  if (!workingDirs[app]) {
    throw new Error(`Unknown app: ${app}. Valid apps: ${Object.keys(workingDirs).join(", ")}`);
  }

  return workingDirs[app];
}

/**
 * Get the base working directory path
 * @returns {string} The base working directory path
 */
export function getBaseWorkingDir() {
  return config.workingDir.base;
}

/**
 * Initialize working directory for an app
 * @param {'crawler'|'docScanner'|'cli'} app - The app name
 * @param {string[]} [subdirs] - Optional subdirectories to create
 * @returns {Promise<string>} The working directory path
 */
export async function initWorkingDir(app, subdirs = []) {
  const workingDir = getWorkingDir(app);
  
  // Ensure base working directory exists
  await ensureDir(workingDir);
  
  // Create subdirectories if specified
  for (const subdir of subdirs) {
    const subdirPath = path.join(workingDir, subdir);
    await ensureDir(subdirPath);
  }
  
  logger.info(`Initialized working directory for ${app}: ${workingDir}`);
  return workingDir;
}

/**
 * Get a path within an app's working directory
 * @param {'crawler'|'docScanner'|'cli'} app - The app name
 * @param {...string} pathSegments - Path segments to join
 * @returns {string} The full path
 */
export function getWorkingPath(app, ...pathSegments) {
  const workingDir = getWorkingDir(app);
  return path.join(workingDir, ...pathSegments);
}

/**
 * Clean up old files in working directory (optional utility)
 * @param {'crawler'|'docScanner'|'cli'} app - The app name
 * @param {number} maxAgeMs - Maximum age in milliseconds
 * @returns {Promise<number>} Number of files cleaned up
 */
export async function cleanupOldFiles(app, maxAgeMs = 7 * 24 * 60 * 60 * 1000) { // 7 days default
  const workingDir = getWorkingDir(app);
  let cleanedCount = 0;
  
  try {
    const entries = await fs.readdir(workingDir, { withFileTypes: true });
    const now = Date.now();
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(workingDir, entry.name);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAgeMs) {
          await fs.unlink(filePath);
          cleanedCount++;
          logger.debug(`Cleaned up old file: ${filePath}`);
        }
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old files from ${app} working directory`);
    }
  } catch (error) {
    logger.warn(`Failed to cleanup old files for ${app}:`, error.message);
  }
  
  return cleanedCount;
}

/**
 * Get working directory info for all apps
 * @returns {Object} Working directory information
 */
export function getWorkingDirInfo() {
  return {
    base: getBaseWorkingDir(),
    apps: {
      crawler: getWorkingDir('crawler'),
      docScanner: getWorkingDir('docScanner'),
      cli: getWorkingDir('cli'),
    },
    configured: !!process.env.WORKING_DIR,
  };
}