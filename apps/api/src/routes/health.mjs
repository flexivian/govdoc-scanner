export default async function healthRoute(fastify) {
  fastify.get(
    "/health",
    {
      schema: {
  summary: "Health status",
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
