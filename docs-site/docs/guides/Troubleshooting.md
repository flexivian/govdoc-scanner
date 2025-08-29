---
sidebar_position: 6
---

# Troubleshooting

This guide helps you diagnose and resolve common issues when using GovDoc Scanner.

## Most Important Debugging Tip

### Enable Debug Logging

```bash
# Add to your .env file
LOG_LEVEL=debug
```

This provides detailed information about:

- **File operations**: Directory creation, file cleanup, and working directory setup
- **Processing steps**: Document processing flow, metadata handling, and progress tracking
- **Crawler operations**: Page scraping, search results, and download decisions
- **Configuration validation**: Settings loading and validation results
- **API retry logic**: Retry attempts, delays, and failure reasons (warnings/errors)
- **Error details**: Full stack traces and error context

**Important**: Debug mode disables progress bars in the CLI application and shows logs in real-time as they occur. This makes it easier to see exactly what's happening during processing, but you won't see the usual progress bar.

If you prefer to see progress bars with some logging, use `LOG_LEVEL=info` instead. Note that in info/warn/error modes, only error messages appear immediately during progress operations - other logs (info, warn, debug) are buffered and shown after the progress bar completes.

## Configuration Issues

### "GEMINI_API_KEY is required"

**Problem**: The application cannot start because the required API key is missing.

**Solutions**:

- Ensure `.env` file exists in project root
- Verify `GEMINI_API_KEY` is set correctly in the `.env` file
- Check API key is valid at [Google AI Studio](https://aistudio.google.com/app/apikey)
- Make sure there are no extra spaces or quotes around the API key

### "Configuration validation failed"

**Problem**: One or more configuration values are invalid.

**Solutions**:

- Check numeric values are within valid ranges (see [Configuration](./Configuration.md))
- Verify URL formats are correct (e.g., `https://example.com`)
- Ensure boolean values are exactly "true" or "false" (lowercase)
- Remove any trailing spaces or invalid characters

### "API validation failed"

**Problem**: Cannot connect to or authenticate with the Gemini API.

**Solutions**:

- Test API key manually at [Google AI Studio](https://aistudio.google.com/app/apikey)
- Check internet connectivity
- Verify API quotas and billing status in your Google Cloud account
- Try increasing `GEMINI_TIMEOUT_MS` if you have slow internet
- Check if your IP is blocked or if there are firewall restrictions

## Installation and Setup Issues

### "npm install" fails

**Problem**: Dependencies cannot be installed.

**Solutions**:

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# If using a different Node.js version, ensure compatibility
node --version  # Should be v18.x or newer
```

### "Module not found" errors

**Problem**: Node.js cannot find required modules.

**Solutions**:

- Ensure you're running commands from the project root directory
- Verify all dependencies are installed: `npm install`
- Check Node.js version compatibility (v18.x or newer required)

### Permission errors on Linux/macOS

**Problem**: Cannot create directories or write files.

**Solutions**:

```bash
# Fix permissions for working directory
chmod 755 ~/.govdoc

# Or use a different working directory you have write access to
echo "WORKING_DIR=~/my-govdoc-data" >> .env
```

## Runtime Issues

### Crawler Issues

**"Page load timeout" or "Download timeout"**

**Solutions**:

- Increase timeout values in `.env`:
  ```bash
  PAGE_LOAD_TIMEOUT_MS=120000
  DOWNLOAD_TIMEOUT_MS=300000
  ```
- Check internet connection stability
- Try reducing concurrent operations by lowering `CRAWLER_MAX_RETRIES`

**"No documents found for company"**

**Solutions**:

- Verify the GEMI ID is correct and exists
- Check if the company has any published documents on the GEMI portal
- Try accessing the company page manually in a browser to confirm availability

**Browser/Puppeteer issues**

**Solutions**:

```bash
# For debugging, disable headless mode
echo "CRAWLER_HEADLESS=false" >> .env

# Install additional browser dependencies on Linux
sudo apt-get update
sudo apt-get install -y chromium-browser
```

### Document Processing Issues

**"Failed to process document"**

**Solutions**:

- Check if the document file is corrupted or password-protected
- Verify file format is supported (PDF, DOC, DOCX)
- Increase API timeout: `GEMINI_TIMEOUT_MS=30000`
- Enable debug logging: `LOG_LEVEL=debug`

**"Insufficient API quota" or rate limiting**

**Solutions**:

- Check your Google AI Studio quota limits
- Increase retry delays:
  ```bash
  GEMINI_INITIAL_DELAY_MS=5000
  GEMINI_MAX_BACKOFF_DELAY_MS=120000
  ```
- Reduce concurrent processing if running multiple instances

### File System Issues

**"Cannot create directory" or "Permission denied"**

**Solutions**:

```bash
# Use a custom working directory with proper permissions
echo "WORKING_DIR=/tmp/govdoc-data" >> .env

# Or fix permissions for the default directory
mkdir -p ~/.govdoc
chmod 755 ~/.govdoc
```

**"Disk space full"**

**Solutions**:

- Clean up old downloads: `rm -rf ~/.govdoc/*/downloads/*/`
- Use a different working directory with more space
- Set up automatic cleanup for old files

## Performance Issues

### Slow Processing

**Solutions**:

- Enable debug logging to identify bottlenecks: `LOG_LEVEL=debug`
- Check network speed and stability
- Monitor API response times
- Consider processing fewer companies at once

### Test Individual Components

```bash
# Test just the configuration
npm start govdoc -- --help

# Test API connectivity
npm start scanner  # Will validate API on startup

# Test crawler without processing
npm start crawler
```
