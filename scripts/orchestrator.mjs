import fs from "fs/promises";
import path from "path";
import pLimit from "p-limit";
import readline from "readline/promises";
import { stdin, stdout } from "process";
import cliProgress from "cli-progress";

import { runCrawlerForGemiIds } from "../apps/crawler/src/id_crawler.mjs";
import { getMetadataModel } from "../apps/doc-scanner/src/gemini-config.mjs";
import { processSingleFile } from "../apps/doc-scanner/src/processing-logic.mjs";

const GEMINI_CONCURRENCY_LIMIT = 15;
const projectRoot = process.cwd();

/**
 * Temporarily suppress console output while invoking the crawler.
 */
async function silentCrawl(ids, outputRoot) {
  const origLog = console.log;
  const origErr = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    return await runCrawlerForGemiIds(ids, outputRoot);
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

/**
 * Scan all PDFs, DOC, and DOCX files in a directory and count successes.
 */
async function runDocScannerForGemiId(id, inputDir) {
  let files;
  try {
    // Include .pdf, .doc, .docx
    files = (await fs.readdir(inputDir)).filter((f) =>
      /\.(pdf|docx?)$/i.test(f)
    );
  } catch {
    return { found: 0, scanned: 0 };
  }
  const found = files.length;
  if (found === 0) {
    return { found, scanned: 0 };
  }

  const limit = pLimit(GEMINI_CONCURRENCY_LIMIT);
  const model = getMetadataModel();
  const outputDir = path.join(projectRoot, "output", id);
  const tasks = files.map((f) =>
    limit(() => processSingleFile(path.join(inputDir, f), outputDir, f, model))
  );

  const results = await Promise.allSettled(tasks);
  const scanned = results.filter(
    (r) => r.status === "fulfilled" && r.value?.status === "success"
  ).length;
  return { found, scanned };
}

/**
 * Prompt user for GEMI IDs via CLI.
 */
async function getUserIds() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  console.log("Select input: 1) Single ID  2) File");
  const choice = (await rl.question("Choice (1 or 2): ")).trim();
  let ids = [];

  if (choice === "1") {
    const id = (await rl.question("GEMI ID: ")).trim();
    if (!/^\d+$/.test(id)) throw new Error("Invalid ID format.");
    ids = [id];
  } else if (choice === "2") {
    const fp = (await rl.question("File path: ")).trim();
    const content = await fs.readFile(fp, "utf-8");
    ids = content.split(/\r?\n/).filter((l) => /^\d+$/.test(l));
    if (!ids.length) throw new Error("No valid IDs found in file.");
  } else {
    throw new Error("Invalid choice.");
  }

  rl.close();
  return ids;
}

/**
 * Main orchestration: crawls and scans IDs with a unified progress bar.
 */
async function runOrchestration() {
  const ids = await getUserIds();
  console.log(`Processing ${ids.length} GEMI ID(s)...`);

  const outputRoot = path.join(projectRoot, "output");
  const stats = {};
  const totalSteps = ids.length * 2; // crawl + scan per ID
  const progressBar = new cliProgress.SingleBar(
    {
      format: "Progress |{bar}| {percentage}% | {value}/{total} tasks",
      etaBuffer: 0,
    },
    cliProgress.Presets.shades_classic
  );

  progressBar.start(totalSteps, 0);
  const scanJobs = [];

  for (const id of ids) {
    // 1) Crawl
    const map = await silentCrawl([id], outputRoot);
    const downloadDir = map[id];

    if (!downloadDir) {
      // no downloads → zero found/scanned
      stats[id] = { found: 0, scanned: 0 };
      progressBar.increment(); // crawl done
      progressBar.increment(); // scan done
      continue;
    }

    // 2) List document files
    let files;
    try {
      files = (await fs.readdir(downloadDir)).filter((f) =>
        /\.(pdf|docx?)$/i.test(f)
      );
    } catch {
      stats[id] = { found: 0, scanned: 0 };
      progressBar.increment();
      progressBar.increment();
      continue;
    }

    stats[id] = { found: files.length, scanned: 0 };
    progressBar.increment(); // crawl done

    if (files.length === 0) {
      progressBar.increment(); // nothing to scan
    } else {
      // 3) Scan asynchronously
      scanJobs.push(
        runDocScannerForGemiId(id, downloadDir).then((res) => {
          stats[id].scanned = res.scanned;
          progressBar.increment();
        })
      );
    }
  }

  // wait for scans
  await Promise.allSettled(scanJobs);
  progressBar.stop();

  // summary
  console.log("\nSummary:");
  for (const id of ids) {
    const { found, scanned } = stats[id];
    console.log(` ${id}: found ${found}, scanned ${scanned}`);
  }
}

runOrchestration().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});