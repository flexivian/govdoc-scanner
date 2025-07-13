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
          value: "file"
        },
        {
          name: "🔢 Enter specific GEMI IDs",
          value: "manual"
        },
        {
          name: "🏢 Search by company VAT numbers (coming soon)",
          value: "vat",
          disabled: "Feature not implemented yet"
        },
        {
          name: "🎲 Process random companies (coming soon)", 
          value: "random",
          disabled: "Feature not implemented yet"
        }
      ]
    }
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
      }
    }
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
        
        const ids = input.split(",").map(id => id.trim());
        const invalidIds = ids.filter(id => !/^\d+$/.test(id));
        
        if (invalidIds.length > 0) {
          return `Invalid GEMI IDs: ${invalidIds.join(", ")}. Only numbers are allowed.`;
        }
        
        return true;
      }
    }
  ]);

  return gemiIds.split(",").map(id => id.trim());
}

/**
 * Prompt for VAT numbers (placeholder for future implementation)
 */
export async function promptVatNumbers() {
  const { vatNumbers } = await inquirer.prompt([
    {
      type: "input",
      name: "vatNumbers",
      message: "Enter VAT numbers (comma-separated):",
      validate: (input) => {
        if (!input.trim()) {
          return "Please enter at least one VAT number.";
        }
        return true;
      }
    }
  ]);

  return vatNumbers.split(",").map(vat => vat.trim());
}

/**
 * Prompt for random company count (placeholder for future implementation)
 */
export async function promptRandomCount() {
  const { count } = await inquirer.prompt([
    {
      type: "number",
      name: "count",
      message: "How many random companies to process?",
      default: 10,
      validate: (input) => {
        if (!Number.isInteger(input) || input < 1) {
          return "Please enter a positive integer.";
        }
        if (input > 100) {
          return "Maximum 100 companies allowed for random processing.";
        }
        return true;
      }
    }
  ]);

  return count;
}

/**
 * Confirmation prompt before starting processing
 */
export async function promptConfirmation(gemiIds, mode) {
  let message = "";
  
  switch (mode) {
    case "file":
      message = `Process ${gemiIds.length} GEMI ID(s) from file?`;
      break;
    case "manual":
      message = `Process ${gemiIds.length} manually entered GEMI ID(s)?`;
      break;
    case "vat":
      message = `Search and process companies with ${gemiIds.length} VAT number(s)?`;
      break;
    case "random":
      message = `Process ${gemiIds} random companies?`;
      break;
  }

  const { confirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message: message,
      default: true
    }
  ]);

  return confirmed;
}
