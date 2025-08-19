import cliProgress from "cli-progress";

export class ProgressManager {
  constructor() {
    this.currentBar = null;
    this.isActive = false;
    this.barState = null; // Store bar state for potential restart
    this.bufferedLogs = []; // Buffer logs during progress operations
  }

  createBar(total, options = {}) {
    this.currentBar = new cliProgress.SingleBar({
      format: "Progress |{bar}| {percentage}% | {value}/{total} | {status}",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
      ...options,
    });

    this.barState = { total, current: 0, status: "Starting..." };
    this.currentBar.start(total, 0, { status: "Starting..." });
    this.isActive = true;
    this.bufferedLogs = []; // Clear any previous buffered logs
    return this.currentBar;
  }

  update(value, status = "") {
    if (this.currentBar && this.isActive) {
      this.barState.current = value;
      this.barState.status = status;
      this.currentBar.update(value, { status });
    }
  }

  stop() {
    if (this.currentBar && this.isActive) {
      this.currentBar.stop();
      this.isActive = false;
      this.barState = null;

      // Flush any buffered logs after progress stops
      this.flushBufferedLogs();
    }
  }

  // Completely stop and clear the progress bar
  forceStop() {
    if (this.currentBar) {
      this.currentBar.stop();
      this.isActive = false;
      this.barState = null;
      // Clear the line where progress bar was
      process.stdout.write("\r\x1b[K");

      // Flush any buffered logs after progress stops
      this.flushBufferedLogs();
    }
  }

  // Buffer a log message during progress operations
  bufferLog(stream, message) {
    if (this.isActive) {
      this.bufferedLogs.push({ stream, message });
      return true; // Indicates log was buffered
    }
    return false; // Indicates log should be output immediately
  }

  // Flush all buffered logs
  flushBufferedLogs() {
    if (this.bufferedLogs.length > 0) {
      // Add a small delay to ensure progress bar is fully cleared
      setTimeout(() => {
        this.bufferedLogs.forEach(({ stream, message }) => {
          if (stream === "stdout") {
            process.stdout.write(message);
          } else {
            process.stderr.write(message);
          }
        });
        this.bufferedLogs = [];
      }, 50);
    }
  }

  // Show error above progress bar without disrupting it
  showError(message) {
    if (this.isActive && this.currentBar) {
      // Temporarily stop, show error, then continue
      this.currentBar.stop();
      process.stderr.write(`\n❌ ${message}\n`);

      // Restart with current state if we have it
      if (this.barState) {
        this.currentBar.start(this.barState.total, this.barState.current, {
          status: this.barState.status,
        });
      }
    } else {
      process.stderr.write(`❌ ${message}\n`);
    }
  }
}

export const progressManager = new ProgressManager();
