import createCompanyRepo from "../../services/company-repo.mjs";

export default async function searchCompaniesRoute(fastify) {
  fastify.get(
    "/companies",
    {
      schema: {
        description:
          "Search Greek companies from GEMI registry data. Use query parameters to filter by name, tax ID, location, or company type. Results are paginated and sorted by scan date (newest first) or company name.",
        summary: "Search companies",
        tags: ["companies"],
        querystring: {
          type: "object",
          properties: {
            q: {
              type: "string",
              maxLength: 512,
              description:
                "Search query for company name. Supports fuzziness and partial matching.",
            },
            tax_id: {
              type: "string",
              description: "Exact company tax ID for precise matching.",
            },
            region: { type: "string" },
            city: { type: "string" },
            company_type: { type: "string" },
            sort: {
              type: "string",
              enum: ["scan_date:desc", "company_name.raw:asc"],
            },
            from: {
              type: "integer",
              minimum: 0,
              default: 0,
              description:
                "Pagination offset: number of matching records to skip before collecting results.",
            },
            size: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 10,
              description:
                "Page size: maximum number of records to return (max 100).",
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
              meta: {
                type: "object",
                properties: {
                  total: { type: "number" },
                  from: { type: "number" },
                  size: { type: "number" },
                  request_id: { type: "string" },
                },
              },
            },
          },
          400: { $ref: "Error#" },
          401: { $ref: "Error#" },
          403: { $ref: "Error#" },
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
      const {
        q,
        tax_id,
        region,
        city,
        company_type,
        sort,
        from = 0,
        size = 10,
      } = req.query;
      if (q && q.length > 512) {
        return reply.code(400).send({
          error: {
            code: "q_too_long",
            message: "q exceeds 512 chars",
            request_id: req.id,
          },
        });
      }
      const repo = createCompanyRepo(fastify.opensearch, {
        index: process.env.OPENSEARCH_INDEX,
      });
      const result = await repo.search({
        q,
        tax_id,
        from,
        size,
        region,
        city,
        company_type,
        sort,
      });
      return {
        data: result.hits,
        meta: { total: result.total, from, size, request_id: req.id },
      };
    }
  );
}
