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
      label: "Guides",
      items: [
        "guides/Getting Started",
        "guides/Configuration",
        "guides/Development",
        "guides/Troubleshooting"
      ],
    },
    {
      type: "category",
      label: "Advanced Integrations",
      items: ["integrations/OpenSearch", "integrations/REST-API"],
    },
    {
      type: "category",
      label: "GSoC",
      items: [
        {
          type: "doc",
          id: "gsoc/2025/overview",
          label: "2025",
        },
      ],
    },
  ],
};

export default sidebars;
