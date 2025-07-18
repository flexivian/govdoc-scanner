---
sidebar_position: 2
---

# Development Setup

This guide will help you set up the GovDoc Scanner project for development purposes.

## Prerequisites

- **Node.js**: v18.x or newer (recommended: v20.x LTS)
- **Git**: For version control
- **Gemini API Key**: Required for document processing ([Get one here](https://aistudio.google.com/app/apikey))
- **Code Editor**: VS Code recommended with Nx Console extension

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
│   ├── crawler/            # GEMI portal scraping
│   └── doc-scanner/        # Document processing
├── scripts/
│   └── orchestrator.mjs    # End-to-end workflow
├── docs-site/              # Documentation
└── output/                 # Generated files
```

## Development Workflow

### Running Applications

```bash
# Run individual applications
npx nx run crawler:start
npx nx run doc-scanner:start
npx nx run orchestrator:start

# List all available commands
npx nx show projects
```

### Testing Setup

```bash
# Test crawler functionality
npx nx run crawler:start
# Select search option and try a simple company name

# Test doc-scanner
mkdir -p apps/doc-scanner/src/data/input/test123
# Place a test PDF in the directory
npx nx run doc-scanner:start
# Enter "test123" as GEMI ID
```

## Development Tips

### Code Structure

- Each app has its own `package.json` and dependencies
- Shared utilities can be added to the workspace root
- Use ES modules (`.mjs` files) throughout the project

### Debugging

- Set `DEBUG=true` in `.env` for verbose logging
- Use `console.log` liberally during development
- Check browser developer tools for crawler issues

### API Usage

- Monitor Gemini API quota usage
- Use lower concurrency limits during development
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
**Memory Issues**: Reduce concurrency limits in development
