export default async function statsRoute(fastify) {
  fastify.get(
    "/admin/stats",
    {
      schema: {
  summary: "Cluster stats (admin)",
  tags: ["admin"],
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "object",
                properties: {
                  cluster: {
                    type: "object",
                    properties: {
                      status: { type: "string" },
                      number_of_nodes: { type: "integer" },
                    },
                  },
                  indices: { type: "array", items: { type: "object" } },
                  counts: {
                    type: "object",
                    properties: { total_docs: { type: "integer" } },
                  },
                },
              },
              meta: {
                type: "object",
                properties: { request_id: { type: "string" } },
              },
            },
          },
          403: { $ref: "Error#" },
          503: { $ref: "Error#" },
        },
      },
    },
    async (req, reply) => {
      // Require admin role
      if (req.currentRole !== "admin") {
        return reply.code(403).send({
          error: {
            code: "forbidden",
            message: "Admin role required",
            request_id: req.id,
          },
        });
      }

      if (!fastify.opensearch)
        return reply.code(503).send({
          error: {
            code: "search_unavailable",
            message: "Search unavailable",
            request_id: req.id,
          },
        });

      // Cluster health
      const healthResp = await fastify.opensearch.transport.request({
        method: "GET",
        path: "/_cluster/health",
      });
      const health = healthResp.body || healthResp;

      // Indices matching pattern
      const catResp = await fastify.opensearch.transport.request({
        method: "GET",
        path: "/_cat/indices/govdoc-companies-*?format=json&bytes=b",
      });
      const indices = catResp.body || catResp;

      // Sum docs
      let totalDocs = 0;
      for (const idx of indices) {
        const dc = parseInt(idx["docs.count"] || idx.docsCount || 0, 10);
        if (!Number.isNaN(dc)) totalDocs += dc;
      }

      return {
        data: {
          cluster: {
            status: health.status,
            number_of_nodes: health.number_of_nodes,
          },
          indices,
          counts: { total_docs: totalDocs },
        },
        meta: { request_id: req.id },
      };
    }
  );
}
