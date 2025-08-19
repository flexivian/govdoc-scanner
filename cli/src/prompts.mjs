import inquirer from "inquirer";
import fs from "fs/promises";
import path from "path";

/**
 * Interactive prompt for selecting operation mode
 */
export async function promptOperationMode() {
  const { mode } = await inquirer.prompt([
    {
      type: "list",
      name: "mode",
      message: "Select operation mode: (use arrow keys to navigate)",
      choices: [
        {
          name: "📄 Process GEMI IDs from file",
          value: "file",
        },
        {
          name: "🔢 Enter specific GEMI IDs",
          value: "manual",
        },
        {
          name: "🎲 Process random companies",
          value: "random",
        },
      ],
    },
  ]);

  return mode;
}

/**
 * Prompt for file input
 */
export async function promptFileInput() {
  const { filePath } = await inquirer.prompt([
    {
      type: "input",
      name: "filePath",
      message: "Enter path to .gds file:",
      default: "./companies.gds",
      validate: async (input) => {
        try {
          await fs.access(input);
          return true;
        } catch {
          return "File not found. Please enter a valid file path.";
        }
      },
    },
  ]);

  return filePath;
}

/**
 * Prompt for manual GEMI ID input
 */
export async function promptManualGemiIds() {
  const { gemiIds } = await inquirer.prompt([
    {
      type: "input",
      name: "gemiIds",
      message: "Enter GEMI IDs (comma-separated):",
      validate: (input) => {
        if (!input.trim()) {
          return "Please enter at least one GEMI ID.";
        }

        const ids = input.split(",").map((id) => id.trim());
        const invalidIds = ids.filter((id) => !/^\d+$/.test(id));

        if (invalidIds.length > 0) {
          return `Invalid GEMI IDs: ${invalidIds.join(", ")}. Only numbers are allowed.`;
        }

        return true;
      },
    },
  ]);

  return gemiIds.split(",").map((id) => id.trim());
}

/**
 * Prompt for random company count
 */
export async function promptRandomCount() {
  const { count } = await inquirer.prompt([
    {
      type: "number",
      name: "count",
      message: "How many random companies to process?",
      default: 5,
      validate: (input) => {
        if (!Number.isInteger(input) || input < 1) {
          return "Please enter a positive integer.";
        }
        if (input > 11) {
          return "Maximum 10 companies allowed for random processing.";
        }
        return true;
      },
    },
  ]);

  return count;
}
