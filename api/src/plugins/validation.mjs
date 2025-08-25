import fp from "fastify-plugin";

async function validationPlugin(fastify) {
  fastify.addSchema({
    $id: "Error",
    type: "object",
    description: "Canonical error schema used across all endpoints",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          request_id: { type: "string" },
          details: { type: "object", additionalProperties: true },
        },
        required: ["code", "message", "request_id"],
      },
    },
    required: ["error"],
  });
}

export default fp(validationPlugin, { name: "validation" });
