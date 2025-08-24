// Search representatives nested within company documents.
// Query params: name OR tax_id (at least one required). If name provided min 2 chars. Supports pagination.
export default async function representativesSearchRoute(fastify) {
  fastify.get(
    "/companies/representatives",
    {
      schema: {
        description:
          "Search for company representatives by name across all companies. Returns companies that have representatives matching the search criteria, along with the matching representative details.",
        tags: ["companies"],
        summary: "Search company representatives",
        querystring: {
          type: "object",
          properties: {
            name: {
              type: "string",
              minLength: 2,
              description:
                "Representative name (partial allowed). Required if tax_id not provided.",
            },
            tax_id: {
              type: "string",
              description:
                "Exact representative tax ID. Required if name not provided.",
            },
            from: {
              type: "integer",
              minimum: 0,
              default: 0,
              description: "Pagination offset (number of records to skip).",
            },
            size: {
              type: "integer",
              minimum: 1,
              maximum: 50,
              default: 10,
              description: "Page size (max 50).",
            },
          },
          anyOf: [{ required: ["name"] }, { required: ["tax_id"] }],
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    gemi_id: { type: "string" },
                    company_name: { type: "string" },
                    representatives: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          role: { type: "string" },
                          is_active: { type: "boolean" },
                          tax_id: { type: "string" },
                          capital_share_percent: {
                            type: "number",
                            nullable: true,
                          },
                          capital_share_amount_eur: {
                            type: "number",
                            nullable: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
              meta: {
                type: "object",
                properties: {
                  total: { type: "integer" },
                  from: { type: "integer" },
                  size: { type: "integer" },
                  request_id: { type: "string" },
                },
              },
            },
          },
          400: { $ref: "Error#" },
          401: { $ref: "Error#" },
          403: { $ref: "Error#" },
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
      const { name, tax_id: taxId, from = 0, size = 10 } = req.query;
      if (!name && !taxId)
        return reply.code(400).send({
          error: {
            code: "missing_query",
            message: "Provide either name or tax_id",
            request_id: req.id,
          },
        });
      if (name && name.length < 2)
        return reply.code(400).send({
          error: {
            code: "name_too_short",
            message: "Name too short",
            request_id: req.id,
          },
        });

      const index = process.env.OPENSEARCH_INDEX || "govdoc-companies-000001";

      // Build nested representative query. Using match_phrase_prefix for partial name matching.
      const mustClauses = [];
      // Build nested query only if name or taxId provided
      const nameTaxFilters = [];
      if (name) {
        nameTaxFilters.push({
          match_phrase_prefix: { "representatives.name": { query: name } },
        });
      }
      if (taxId) {
        nameTaxFilters.push({ term: { "representatives.tax_id": taxId } });
      }
      if (nameTaxFilters.length) {
        mustClauses.push({
          nested: {
            path: "representatives",
            query: {
              bool: { must: nameTaxFilters },
            },
            inner_hits: {
              size: 5,
              _source: [
                "representatives.name",
                "representatives.role",
                "representatives.is_active",
                "representatives.tax_id",
                "representatives.capital_share_percent",
                "representatives.capital_share_amount_eur",
              ],
            },
          },
        });
      }

      const body = {
        from,
        size,
        query: { bool: { must: mustClauses } },
        _source: ["gemi_id", "company_name"],
      };

      const resp = await fastify.opensearch.search({ index, body });
      const raw = resp.body || resp;
      const hits = raw.hits?.hits || [];
      const total =
        typeof raw.hits?.total === "object"
          ? raw.hits.total.value
          : hits.length;
      const data = hits.map((h) => {
        const source = h._source || {};
        const representativeHits =
          h.inner_hits?.representatives?.hits?.hits?.map((ih) => ih._source) ||
          [];
        // inner_hits _source will have path prefix; flatten values
        const representatives = representativeHits.map((r) => ({
          name: r.representatives?.name ?? r.name ?? null,
          role: r.representatives?.role ?? r.role ?? null,
          is_active: r.representatives?.is_active ?? r.is_active ?? null,
          tax_id: r.representatives?.tax_id ?? r.tax_id ?? null,
          capital_share_percent:
            r.representatives?.capital_share_percent ??
            r.capital_share_percent ??
            null,
          capital_share_amount_eur:
            r.representatives?.capital_share_amount_eur ??
            r.capital_share_amount_eur ??
            null,
        }));
        return {
          gemi_id: source.gemi_id,
          company_name: source.company_name,
          representatives,
        };
      });

      return { data, meta: { total, from, size, request_id: req.id } };
    }
  );
}
