import createCompanyRepo from "../../services/company-repo.mjs";

export default async function getCompanyRoute(fastify) {
  fastify.get(
    "/companies/:gemiId",
    {
      schema: {
  summary: "Get company data by GEMI ID",
        tags: ["companies"],
        params: {
          type: "object",
          required: ["gemiId"],
          properties: { gemiId: { type: "string" } },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: { type: "object", additionalProperties: true },
              meta: {
                type: "object",
                properties: { request_id: { type: "string" } },
              },
            },
          },
          401: { $ref: "Error#" },
          403: { $ref: "Error#" },
          404: { $ref: "Error#" },
          408: { $ref: "Error#" },
          503: { $ref: "Error#" },
        },
      },
    },
    async (req, reply) => {
      if (!fastify.opensearch)
        return reply.code(503).send({
          error: {
            code: "search_unavailable",
            message: "Search unavailable",
            request_id: req.id,
          },
        });
      const repo = createCompanyRepo(fastify.opensearch, {
        index: process.env.OPENSEARCH_INDEX,
      });
      const company = await repo.getById(req.params.gemiId);
      if (!company)
        return reply.code(404).send({
          error: {
            code: "not_found",
            message: "Company not found",
            request_id: req.id,
          },
        });
      return { data: company, meta: { request_id: req.id } };
    }
  );
}
