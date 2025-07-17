---
sidebar_position: 1
---

# Code Examples Overview

This section provides simple examples for using the GovDoc Scanner orchestrator - the recommended way to use the project.

## Orchestrator Examples

The orchestrator provides the complete end-to-end workflow, combining crawling and document processing automatically.

### Basic Usage

**Single Company Processing:**

```bash
npx nx run orchestrator:start
# Select: 1) Single ID
# Enter GEMI ID: 123204604000
# Wait for automatic crawling and processing
```

**Batch Processing from File:**

```bash
# Create a file with GEMI IDs (one per line)
echo "123204604000" > companies.txt
echo "144340502000" >> companies.txt

# Run orchestrator
npx nx run orchestrator:start
# Select: 2) File
# Enter file path: companies.txt
```

### Programmatic Usage

**Simple Integration:**

```javascript
import { spawn } from "child_process";

async function processCompanies(gemiIds) {
  return new Promise((resolve, reject) => {
    const orchestrator = spawn("npx", ["nx", "run", "orchestrator:start"]);

    // Send input
    orchestrator.stdin.write("2\n"); // File option
    orchestrator.stdin.write("./ids.txt\n");
    orchestrator.stdin.end();

    orchestrator.on("close", (code) => {
      code === 0 ? resolve() : reject(new Error(`Failed: ${code}`));
    });
  });
}
```

### Output Structure

After processing, you'll find results in the `output/` directory:

```
output/
├── 123204604000/
│   ├── 123204604000_final_metadata.json  # Comprehensive company metadata
│   └── document_downloads/
│       ├── 2019-09-23_90189.pdf
│       └── 2020-11-03_2334237.pdf
└── govdoc-output.json  # Summary of all processed companies
```

## Individual Applications

For specific use cases, you can use individual applications:

- **[Crawler Examples](./crawler-examples.md)** - Web scraping and document downloading
- **[Doc-Scanner Examples](./doc-scanner-examples.md)** - Document processing and metadata extraction

## Next Steps

- Check the [Getting Started](../installation/Getting%20Started.md) guide for setup
- Explore [Development Setup](../installation/Development.md) for advanced usage
- Review the [GSoC 2025 Overview](../gsoc/2025/overview.md) for project roadmap
