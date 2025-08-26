---
sidebar_position: 2
---

# Development Setup

This guide will help you set up the GovDoc Scanner project for development purposes.

## Prerequisites

- **Node.js**: v18.x or newer (recommended: v20.x LTS)
- **Git**: For version control
- **Gemini API Key**: Required for document processing ([Get one here](https://aistudio.google.com/app/apikey))
- **Code Editor**: VS Code recommended for development

## Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub first, then clone your fork
git clone https://github.com/your-username/govdoc-scanner.git
cd govdoc-scanner

# Add upstream remote
git remote add upstream https://github.com/flexivian/govdoc-scanner.git
```

### 2. Install Dependencies

```bash
npm install
# This also installs Playwright browsers automatically
```

### 3. Environment Configuration

```bash
cp .env.example .env
# Edit .env and add your Gemini API key
```

## Project Structure

```
govdoc-scanner/
├── apps/
│   ├── api/                # REST API server
│   ├── cli/                # Unified CLI tool for complete workflow orchestration
│   ├── opensearch/         # OpenSearch configuration and setup
│   ├── crawler/            # GEMI portal scraping with enhanced date extraction
│   └── doc-scanner/        # AI-powered document processing with chronological analysis
├── shared/                 # Shared utilities and configuration
├── docs-site/              # Documentation
└── output/                 # Generated files
```

## Development Workflow

### Running Applications

```bash
# Run individual applications
npm start crawler
npm start scanner
npm start govdoc

# Show help for any command
npm start help
npm start govdoc -- --help
```

### Testing Setup

```bash
# Test crawler functionality
npm start crawler
# Select search option and try a simple company name

# Test doc-scanner
mkdir -p apps/doc-scanner/src/data/input/test123
# Place a test PDF in the directory (name with date prefix: 2024-01-15_document.pdf)
npm start scanner
# Enter "test123" as GEMI ID

# Test complete workflow
npm start govdoc
# Follow interactive prompts or use command line mode
```

## Development Tips

### Code Structure

- Each app has its own `package.json` and dependencies
- Shared modules live under `shared/`
- Use ES modules (`.mjs` files) throughout the project

### Debugging

- Set `LOG_LEVEL=debug` in `.env` for verbose logging
- Use `console.log` liberally during development
- Check browser developer tools for crawler issues

### API Usage

- Monitor Gemini API quota usage
- Use smaller batches (fewer companies/documents) during development
- Test with small document sets first

## Contributing

### Development Process

```bash
# Keep your fork updated
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Description of changes"

# Push and create PR
git push origin feature/your-feature-name
```

### Code Guidelines

- Follow existing code style and patterns
- Add comments for complex logic
- Test changes with real GEMI data
- Update documentation for new features

## Troubleshooting

**Playwright Issues**: Run `npx playwright install chromium`
**Permission Errors**: Check directory permissions for input/output folders
**API Failures**: Verify Gemini API key and quota
**Memory Issues**: Process fewer companies/documents per run (split into smaller batches)
