// Search representatives by name or tax_id. One of name or tax_id required.
export default async function representativesSearchRoute(fastify) {
  fastify.get(
    "/companies/representatives",
    {
      schema: {
        summary: "Search representatives",
        tags: ["companies"],
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
              description: "Page size (max 50)",
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
                    matched_in_tracked_changes: {
                      type: "boolean",
                      description:
                        "True if match was found in tracked changes rather than structured representatives data",
                    },
                    history_matches: {
                      type: "array",
                      description:
                        "Matched historical tracked change snippets (nested docs)",
                      items: {
                        type: "object",
                        properties: {
                          file_name: { type: "string" },
                          doc_date: { type: "string", format: "date" },
                          company_changes: { type: "string", nullable: true },
                          economic_changes: { type: "string", nullable: true },
                        },
                      },
                    },
                    representatives: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          role: { type: "string" },
                          is_active: { type: "boolean" },
                          tax_id: { type: "string" },
                          capital_amount: { type: "string", nullable: true },
                          capital_percentage: {
                            type: "string",
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

      // Search in structured representatives field
      const nameTaxFilters = [];
      if (name) {
        nameTaxFilters.push({
          match: {
            "representatives.name": {
              query: name,
              fuzziness: 2,
              minimum_should_match: "100%",
            },
          },
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
                "representatives.capital_amount",
                "representatives.capital_percentage",
              ],
            },
          },
        });
      }

      // Also search in tracked change summary fields (structure + economic)
      const shouldClauses = [];
      if (name) {
        // Search in current tracked changes - use match with very low fuzziness
        for (const field of [
          "tracked_company_changes",
          "tracked_economic_changes",
        ]) {
          shouldClauses.push({
            match: {
              [field]: {
                query: name,
                fuzziness: 2,
                minimum_should_match: "100%",
              },
            },
          });
        }

        // Search in tracked changes history (both company_changes & economic_changes)
        shouldClauses.push({
          nested: {
            path: "tracked_changes_history",
            query: {
              bool: {
                should: [
                  {
                    match: {
                      "tracked_changes_history.company_changes": {
                        query: name,
                        fuzziness: 2,
                        minimum_should_match: "100%",
                      },
                    },
                  },
                  {
                    match: {
                      "tracked_changes_history.economic_changes": {
                        query: name,
                        fuzziness: 2,
                        minimum_should_match: "100%",
                      },
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            inner_hits: {
              size: 5,
              _source: [
                "tracked_changes_history.file_name",
                "tracked_changes_history.doc_date",
                "tracked_changes_history.company_changes",
                "tracked_changes_history.economic_changes",
              ],
            },
          },
        });
      }

      // Combine structured and tracked changes searches
      const finalQuery = {};
      if (mustClauses.length && shouldClauses.length) {
        // If both structured and tracked changes searches exist, use should with minimum_should_match
        finalQuery.bool = {
          should: [...mustClauses, ...shouldClauses],
          minimum_should_match: 1,
        };
      } else if (mustClauses.length) {
        // Only structured representatives search
        finalQuery.bool = { must: mustClauses };
      } else if (shouldClauses.length) {
        // Only tracked changes search
        finalQuery.bool = { should: shouldClauses };
      } else {
        // Fallback - shouldn't happen due to validation above
        finalQuery.match_all = {};
      }

      const body = {
        from,
        size,
        query: finalQuery,
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

        // Handle structured representatives data
        const representatives = representativeHits.map((r) => ({
          name: r.representatives?.name ?? r.name ?? null,
          role: r.representatives?.role ?? r.role ?? null,
          is_active: r.representatives?.is_active ?? r.is_active ?? null,
          tax_id: r.representatives?.tax_id ?? r.tax_id ?? null,
          capital_amount:
            r.representatives?.capital_amount ?? r.capital_amount ?? null,
          capital_percentage:
            r.representatives?.capital_percentage ??
            r.capital_percentage ??
            null,
        }));

        // Collect history matches (nested inner hits)
        const historyHits =
          h.inner_hits?.tracked_changes_history?.hits?.hits?.map((ih) => {
            const src = ih._source || {};
            // Depending on ES version, nested fields may appear directly or under path key
            const nested = src.tracked_changes_history || src;
            return {
              file_name: nested.file_name ?? null,
              doc_date: nested.doc_date ?? null,
              company_changes: nested.company_changes ?? null,
              economic_changes: nested.economic_changes ?? null,
            };
          }) || [];

        // If no structured representatives found but there's a match,
        // it might be from tracked changes - include a note
        const result = {
          gemi_id: source.gemi_id,
          company_name: source.company_name,
          representatives,
        };

        // Add indication if match came from tracked changes
        if (
          (representatives.length === 0 && h._score > 0) ||
          historyHits.length > 0
        ) {
          result.matched_in_tracked_changes = true;
        }

        if (historyHits.length > 0) {
          result.history_matches = historyHits;
        }

        return result;
      });

      return { data, meta: { total, from, size, request_id: req.id } };
    }
  );
}
