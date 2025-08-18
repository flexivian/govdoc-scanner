# Doc Scanner Tests

This directory contains unit tests for the doc-scanner application.

## Running Tests

```bash
# Run all tests
npm test
```

## Test Files

### parseGeminiJson.test.mjs

Tests for the `parseGeminiJson` function which handles lenient JSON parsing for AI model responses. The function handles several scenarios:

- **Basic JSON parsing** - Valid JSON objects and error handling
- **Whitespace handling** - Extra spaces, newlines, empty objects
- **Markdown code fences** - Various formats (`json, `JSON, ```, incomplete)
- **AI response patterns** - JSON buried in verbose explanatory text
- **Complex structures** - Nested objects and arrays
- **Error cases** - Null/undefined input, malformed JSON, custom error messages

#### Known Limitations

The function extracts JSON by finding the first `{` and last `}` in text, which works for single JSON objects but may fail for:

1. **Multiple separate JSON objects** in the same response
2. **Broken markdown sections** where AI models split JSON across multiple ```json blocks
3. **Mixed format responses** combining markdown-wrapped and inline JSON

These limitations are documented in the tests, though **none of these scenarios have been encountered in practice.**
