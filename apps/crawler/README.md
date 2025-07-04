# GEMI Company Scraper

A Node.js tool for scraping the Greek Business Portal (GEMI). It allows users to search for companies using a wide range of filters and/or download all available public documents.

## Features

- **Interactive CLI:** A user-friendly command-line interface to guide you through the process.
- **Advanced Search:** Filter companies by name, legal type, status, location, incorporation dates, and more.
- **Smart Filtering:** Includes a "Did you mean...?" feature that corrects typos in filter inputs for a smoother experience.
- **Two-Step Workflow:** First, search and gather a list of target companies. Then, crawl and download their documents.
- **Bulk or Single Crawling:** Download documents for a single GEMI ID or for all companies found in a search.

## Setup

1.  **Install dependencies:**
    Navigate to the project's root directory and run:

    ```sh
    npm install
    ```

## Usage

The application operates in two ways:

- You can search for companies, which saves their IDs to a file or
- Download documents for a single GEMI ID or for all companies found in a file created by you or by the search.

1.  **Start the interactive interface:**

    ```sh
    npm start
    ```

2.  **Search for Companies**

    - From the main menu, choose `1. Search for companies`.
    - You will be prompted to enter a search term (e.g., ΤΡΑΠΕΖΑ).
    - Next, you can optionally provide any number of filters (e.g., Legal Type, Status, Competent Office, Dates). Press Enter to skip any filter.
    - The tool will run the search and save all found GEMI IDs into `ids.txt` in the project root.

3.  **Download Company Documents**
    - From the main menu, choose `2. Download PDFs for companies`.
    - You can now choose to:
      - Enter a single GEMI number to download its documents.
      - Use all the company IDs from the `ids.txt` file created in the previous step or by you.
      - The `ids.txt` should contain 1 GEMI number per line.
    - The crawler will then process each company, visit its public page, and download all available PDF files.

## Output

The tool generates outputs in two locations:

- `ids.txt`: A plain text file created in the project root. It contains the list of GEMI IDs that matched your search criteria, with one ID per line.

- `src/downloads/{GEMI_ID}/`: For each company that is crawled, a folder named with its GEMI ID is created inside `src/downloads/`. All downloaded PDF documents for that company are saved in this folder.
