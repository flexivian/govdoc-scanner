import { parseGeminiJson } from "../src/processing-logic.mjs";
import assert from "node:assert";
import { describe, it } from "node:test";

describe("parseGeminiJson", () => {
  // Basic functionality
  it("should parse valid JSON", () => {
    const result = parseGeminiJson('{"name": "Test Company", "id": "12345"}');
    assert.deepStrictEqual(result, { name: "Test Company", id: "12345" });
  });

  it("should handle whitespace and empty objects", () => {
    assert.deepStrictEqual(parseGeminiJson("  {}  "), {});
    assert.deepStrictEqual(parseGeminiJson('  \n  {"name": "Test"}  \n  '), {
      name: "Test",
    });
  });

  // Markdown handling
  it("should parse markdown-wrapped JSON", () => {
    const markdownJson = '```json\n{"name": "Test Company"}\n```';
    const result = parseGeminiJson(markdownJson);
    assert.deepStrictEqual(result, { name: "Test Company" });
  });

  it("should handle various markdown formats", () => {
    // Without language tag
    assert.deepStrictEqual(parseGeminiJson('```\n{"id": "123"}\n```'), {
      id: "123",
    });
    // With uppercase tag
    assert.deepStrictEqual(parseGeminiJson('```JSON\n{"id": "123"}\n```'), {
      id: "123",
    });
    // Incomplete fences
    assert.deepStrictEqual(parseGeminiJson('```json\n{"id": "123"}'), {
      id: "123",
    });
  });

  // AI model response patterns
  it("should extract JSON from verbose AI responses", () => {
    const verboseResponse = `
    Based on my analysis, here's the metadata:
    {"company_name": "Test Corp", "id": "12345"}
    This covers all the information.`;

    const result = parseGeminiJson(verboseResponse);
    assert.deepStrictEqual(result, { company_name: "Test Corp", id: "12345" });
  });

  it("should handle complex nested structures", () => {
    const complexJson =
      '{"company": {"name": "Test", "details": {"id": "123"}}}';
    const result = parseGeminiJson(complexJson);
    assert.deepStrictEqual(result, {
      company: { name: "Test", details: { id: "123" } },
    });
  });

  // Error handling
  it("should throw error for null/undefined input", () => {
    assert.throws(() => parseGeminiJson(null), /Empty response from model/);
    assert.throws(
      () => parseGeminiJson(undefined),
      /Empty response from model/
    );
  });

  it("should throw error for invalid content", () => {
    assert.throws(
      () => parseGeminiJson("not json at all"),
      /Unexpected content/
    );
    assert.throws(
      () => parseGeminiJson('{"invalid":}'),
      /Failed to parse JSON/
    );
  });

  it("should include filename in error messages", () => {
    assert.throws(() => {
      parseGeminiJson("invalid", "test.pdf");
    }, /Failed to parse JSON for test.pdf/);
  });

  // Current limitations
  it("should fail with broken markdown sections", () => {
    const brokenMarkdown = `
    \`\`\`json
    {"name": "Test"
    \`\`\`
    \`\`\`json
    "id": "123"}
    \`\`\``;

    assert.throws(
      () => parseGeminiJson(brokenMarkdown),
      /Failed to parse JSON/
    );
  });
});
