// @ts-check

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Docusaurus sidebar configuration for govdoc-scanner docs
 *
 * Structure:
 * - What is govdoc-scanner?
 * - Installation
 *   - Getting Started
 *   - Development
 *   - Production
 * - Usage
 * - Architecture
 * - Code Examples
 * - GSoC
 *   - 2025
 */

const sidebars = {
  docsSidebar: [
    "intro",
    {
      type: "category",
      label: "Installation",
      items: [
        "installation/Getting Started",
        "installation/Development",
        "installation/Configuration",
      ],
    },
    {
      type: "category",
      label: "Code Examples",
      items: [
        "code-examples/overview",
        "code-examples/crawler-examples",
        "code-examples/doc-scanner-examples",
        "code-examples/shared-infrastructure",
      ],
    },
    {
      type: "category",
      label: "GSoC",
      items: [
        {
          type: "category",
          label: "2025",
          items: ["gsoc/2025/overview"],
        },
      ],
    },
  ],
};

export default sidebars;
