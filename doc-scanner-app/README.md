# GEMI Document Scanner

A test Node.js tool for processing Greek company documents (GEMI) to extract metadata and create historical timelines.

## Setup

1. Install dependencies:
   Navigate to the project directory `doc-scanner-app`

```sh
npm install
```

2. Create a .env file in the project root:

```sh
GEMINI_API_KEY=your_api_key_here
```

3. Create folder structure:

```
data_src/
  {GEMI_ID}/     # Place source documents here
    doc1.pdf
    doc2.docx
data/            # Output folder (created automatically)
```

## Usage

1. Place your PDF/DOCX documents in a folder named with the GEMI ID under data_src
2. Run the processor:

```sh
node start
```

3. Enter the GEMI ID when prompted
4. The tool will:
   - Process each document in parallel
   - Extract company metadata
   - Generate JSON metadata files
   - Create a contextual history timeline

## Output

The tool generates two types of files in the `data/{GEMI_ID}/` folder:

- Individual metadata JSON files for each processed document
- A consolidated history file named `{GEMI_ID}_contextual_document_histories.json`
