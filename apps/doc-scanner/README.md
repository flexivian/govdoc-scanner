# GEMI Document Scanner

A Node.js tool for processing Greek company documents (GEMI) to extract metadata with enhanced AI-powered analysis. The system uses Google's Gemini AI to intelligently extract company information, representative details, and ownership data from Greek legal documents.

## Features

- **Intelligent Document Processing**: Uses Gemini 2.5 Flash for accurate Greek legal document analysis
- **Representative Tracking**: Accurately identifies company representatives and their active status
- **Share Ownership Analysis**: Extracts capital share percentages and ownership information
- **Chronological Processing**: Processes documents in date order to track company evolution
- **Change Tracking**: Automatically summarizes significant changes between document versions, such as role changes, ownership transfers, and address updates
- **Incremental Processing**: Intelligent metadata checking that skips processing when all documents are up to date, reducing unnecessary API calls
- **Duplicate Prevention**: Advanced merging logic to prevent duplicate representatives
- **Greek Legal Terminology**: Optimized for Greek corporate legal language and structures

## Setup

1. **Install dependencies**:

   ```sh
   npm install
   ```

2. **Create environment file**:
   Copy the example environment file and update it with your Gemini API key:

   ```sh
   cp .env.example .env
   ```

   Then, open `.env` and set:

   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Create input folder structure**:

   ```
   src/data/
     input/
       {GEMI_ID}/           # Place source documents here
         2019-09-23_90189.pdf
         2020-11-03_2334237.pdf
         2021-12-13_2747556.pdf
     output/                # Output folder (created automatically)
   ```

   **Important**: Name your documents with date prefixes (YYYY-MM-DD) for chronological processing.

## Usage

1. **Prepare documents**: Place your documents in a folder named with the GEMI ID under the input folder. Name files with date prefixes for proper chronological processing.

2. **Run the processor**:

   ```sh
   npm start
   ```

3. **Enter GEMI ID**: When prompted, enter the GEMI ID to process.

4. **Processing**: The tool will:
   - Sort documents chronologically by filename date
   - Extract initial metadata from the first (oldest) document
   - Merge information from subsequent documents intelligently
   - Track representative changes and share ownership
   - Generate comprehensive company metadata
   - Display progress and metadata after each document

## Extracted Metadata

The system extracts comprehensive company information including:

- **Company Details**: GEMI ID, tax ID, name, address, type
- **Representatives**: Names, roles, active status, tax IDs, capital shares
- **Ownership Information**: Share percentages and capital amounts
- **Legal Structure**: Company type, competent GEMI office
- **Timeline**: Creation date (from first document) and processing dates
- **Change Tracking**: Detailed summaries of significant changes between document versions

### Tracked Changes Feature

The system automatically generates summaries of significant changes when processing multiple documents:

- **Representative Changes**: New appointments, departures, role modifications
- **Ownership Transfers**: Capital share transfers between parties
- **Structural Changes**: Address updates, company name changes, capital modifications
- **Change History**: Maintains a complete history of all tracked changes by document

Example tracked changes output:

```
"tracked_changes": "• ΠΑΠΑΔΟΠΟΥΛΟΣ ΙΩΑΝΝΗΣ appointed as Διαχειριστής • ΚΩΝΣΤΑΝΤΙΝΟΥ ΜΑΡΙΑ increased ownership to 45% • Company address changed to ΛΕΩΦΟΡΟΣ ΚΗΦΙΣΙΑΣ 200, ΑΘΗΝΑ"
```

### Incremental Processing

The system includes intelligent processing optimization:

- **Metadata Checking**: Automatically determines if processing is needed based on existing metadata
- **File Comparison**: Compares input files with previously processed documents
- **Skip Logic**: Avoids reprocessing when all documents are up to date
- **New File Detection**: Identifies and processes only new or updated documents

## Output

The system generates a comprehensive metadata file:

- **Location**: `apps/doc-scanner/src/data/output/[GEMI_ID]/[GEMI_ID]_final_metadata.json`
- **Format**: Structured JSON with complete company information
- **Content**: All extracted data merged chronologically with tracked changes history
