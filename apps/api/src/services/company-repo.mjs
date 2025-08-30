export function createCompanyRepo(client, { index }) {
  if (!client) throw new Error("OpenSearch client not available");
  const baseIndex =
    index || process.env.OPENSEARCH_INDEX || "govdoc-companies-000001";

  const handleOpenSearchError = (error) => {
    // Handle common OpenSearch errors with proper HTTP status codes
    if (error?.statusCode === 404) return null;
    if (error?.statusCode === 408 || error.name === "TimeoutError") {
      const timeoutError = new Error("Search request timeout");
      timeoutError.statusCode = 408;
      throw timeoutError;
    }
    if (
      error?.statusCode === 503 ||
      error.name === "NoLivingConnectionsError"
    ) {
      const serviceError = new Error("Search service unavailable");
      serviceError.statusCode = 503;
      throw serviceError;
    }
    // Re-throw other errors as-is
    throw error;
  };

  return {
    async getById(id) {
      try {
        const resp = await client.get({ index: baseIndex, id });
        return resp?._source || resp.body?._source || null;
      } catch (e) {
        return handleOpenSearchError(e);
      }
    },
    async search({
      q,
      tax_id,
      from = 0,
      size = 10,
      region,
      city,
      company_type,
      sort,
    }) {
      try {
        const filters = [];
        if (region) filters.push({ term: { region } });
        if (city) filters.push({ term: { city } });
        if (company_type) filters.push({ term: { company_type } });

        const must = [];
        if (q) {
          must.push({
            match: {
              company_name: {
                query: q,
                fuzziness: 2, // Allow some typo tolerance
                minimum_should_match: "100%",
              },
            },
          });
        }
        if (tax_id) {
          must.push({
            term: { company_tax_id: tax_id },
          });
        }

        const body = {
          from,
          size,
          query: {
            bool: {
              must: must.length ? must : undefined,
              filter: filters.length ? filters : undefined,
            },
          },
        };

        if (sort === "scan_date:desc")
          body.sort = [{ scan_date: { order: "desc" } }];
        if (sort === "company_name.raw:asc")
          body.sort = [{ "company_name.raw": { order: "asc" } }];

        const resp = await client.search({ index: baseIndex, body });
        const hits = resp.hits?.hits || resp.body?.hits?.hits || [];
        const total =
          resp.hits?.total?.value ||
          resp.body?.hits?.total?.value ||
          hits.length;
        return {
          hits: hits.map((h) => ({ id: h._id, ...h._source })),
          total,
          from,
          size,
        };
      } catch (e) {
        return handleOpenSearchError(e);
      }
    },
  };
}

export default createCompanyRepo;
