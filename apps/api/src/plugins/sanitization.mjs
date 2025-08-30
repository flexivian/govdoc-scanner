import fp from "fastify-plugin";

async function sanitizationPlugin(fastify) {
  // Sanitize common dangerous patterns in search queries
  const sanitizeSearchQuery = (query) => {
    if (!query || typeof query !== "string") return query;

    // Remove potentially dangerous characters for OpenSearch
    return query
      .replace(/[<>]/g, "") // Remove HTML tags
      .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
      .replace(/script/gi, "") // Remove script tags (basic XSS prevention)
      .trim()
      .substring(0, 512); // Limit query length
  };

  const sanitizePathParameter = (param) => {
    if (!param || typeof param !== "string") return param;

    // Only allow alphanumeric characters and some safe symbols for IDs
    return param.replace(/[^a-zA-Z0-9\-_]/g, "").substring(0, 50);
  };

  // Add sanitization hook for all requests
  fastify.addHook("preValidation", async (req, reply) => {
    // Sanitize query parameters
    if (req.query) {
      if (req.query.q) {
        req.query.q = sanitizeSearchQuery(req.query.q);
      }
      if (req.query.name) {
        req.query.name = sanitizeSearchQuery(req.query.name);
      }
      if (req.query.region) {
        req.query.region = sanitizeSearchQuery(req.query.region);
      }
      if (req.query.city) {
        req.query.city = sanitizeSearchQuery(req.query.city);
      }
    }

    // Sanitize path parameters
    if (req.params) {
      if (req.params.gemiId) {
        req.params.gemiId = sanitizePathParameter(req.params.gemiId);
      }
      if (req.params.id) {
        req.params.id = sanitizePathParameter(req.params.id);
      }
    }

    // Rate limit based on sanitized input to prevent abuse
    const queryLength = JSON.stringify(req.query || {}).length;
    if (queryLength > 2000) {
      return reply.code(413).send({
        error: {
          code: "payload_too_large",
          message: "Query parameters too long",
          request_id: req.id,
        },
      });
    }
  });
}

export default fp(sanitizationPlugin, { name: "sanitization" });
