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
      items: ["installation/Getting Started", "installation/Development"],
    },
    {
      type: "category",
      label: "Code Examples",
      link: { type: "doc", id: "code-examples/overview" },
      items: [
        "code-examples/crawler-examples",
        "code-examples/doc-scanner-examples",
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
