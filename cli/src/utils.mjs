import fs from "fs/promises";

/**
 * Load and parse .gds input file (JSON format)
 */
export async function loadInputFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);

    // Extract GEMI IDs from the input format
    let gemiIds = [];
    if (Array.isArray(data)) {
      // If it's an array of IDs
      gemiIds = data.filter((id) => /^\d+$/.test(String(id)));
    } else if (data.companies && Array.isArray(data.companies)) {
      // If it's an object with companies array
      gemiIds = data.companies
        .map((company) => company.id || company.gemi_id || company["gemi-id"])
        .filter((id) => id && /^\d+$/.test(String(id)));
    } else if (data.gemi_ids && Array.isArray(data.gemi_ids)) {
      // If it has gemi_ids field
      gemiIds = data.gemi_ids.filter((id) => /^\d+$/.test(String(id)));
    }

    if (gemiIds.length === 0) {
      throw new Error("No valid GEMI IDs found in input file");
    }

    return gemiIds.map(String);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Input file not found: ${filePath}`);
    }
    throw new Error(`Error reading input file: ${error.message}`);
  }
}

/**
 * Write consolidated output to JSON file
 */
export async function writeOutput(companies, outputPath) {
  const output = {
    companies: companies,
  };

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nOutput written to: ${outputPath}`);
}

/**
 * Search companies by VAT numbers (placeholder for future implementation)
 */
export async function searchCompaniesByVat(vatNumbers) {
  // TODO: Implement VAT-based company search
  console.log("VAT search functionality will be implemented in a future version.");
  console.log(`Requested VAT numbers: ${vatNumbers.join(", ")}`);
  return [];
}

/**
 * Get random company GEMI IDs (placeholder for future implementation)
 */
export async function getRandomCompanies(count) {
  // TODO: Implement random company selection
  console.log("Random company selection functionality will be implemented in a future version.");
  console.log(`Requested count: ${count}`);
  return [];
}
