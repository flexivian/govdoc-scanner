export default async function healthRoute(fastify) {
  fastify.get(
    "/health",
    {
      schema: {
        description:
          "Check API and OpenSearch database health status. Returns service availability and any degradation warnings.",
        summary: "Health check endpoint",
        tags: ["system"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              opensearch: {
                type: "object",
                properties: {
                  available: { type: "boolean" },
                  degraded: { type: "boolean" },
                },
              },
            },
          },
        },
      },
    },
    async () => ({
      status: fastify.opensearch
        ? fastify.opensearchDegraded
          ? "degraded"
          : "ok"
        : "degraded",
      opensearch: {
        available: !!fastify.opensearch,
        degraded: !!fastify.opensearchDegraded,
      },
    })
  );
}
