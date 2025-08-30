import fp from "fastify-plugin";

async function monitoringPlugin(fastify) {
  let searchMetrics = {
    totalQueries: 0,
    totalQueryTime: 0,
    slowQueries: 0,
    errors: 0,
    timeouts: 0,
  };

  // Track OpenSearch performance
  const originalSearch = fastify.opensearch?.search;
  if (originalSearch) {
    fastify.opensearch.search = async function (params) {
      const startTime = Date.now();
      searchMetrics.totalQueries++;

      try {
        const result = await originalSearch.call(this, params);
        const duration = Date.now() - startTime;
        searchMetrics.totalQueryTime += duration;

        // Track slow queries (>500ms)
        if (duration > 500) {
          searchMetrics.slowQueries++;
          fastify.log.warn(
            {
              searchDuration: duration,
              index: params.index,
              querySize: JSON.stringify(params.body || {}).length,
            },
            "Slow OpenSearch query detected"
          );
        }

        return result;
      } catch (error) {
        searchMetrics.errors++;
        if (error.name === "TimeoutError" || error.statusCode === 408) {
          searchMetrics.timeouts++;
        }
        throw error;
      }
    };
  }

  // Expose internal stats endpoint for monitoring
  fastify.get(
    "/internal/stats",
    {
      schema: {
        hide: true, // Don't show in Swagger docs
        response: {
          200: {
            type: "object",
            properties: {
              api: {
                type: "object",
                properties: {
                  uptime: { type: "number" },
                  requests_total: { type: "number" },
                },
              },
              opensearch: {
                type: "object",
                properties: {
                  queries_total: { type: "number" },
                  query_time_total: { type: "number" },
                  slow_queries_total: { type: "number" },
                  errors_total: { type: "number" },
                  timeouts_total: { type: "number" },
                  avg_query_time: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const avgQueryTime =
        searchMetrics.totalQueries > 0
          ? searchMetrics.totalQueryTime / searchMetrics.totalQueries
          : 0;

      return {
        api: {
          uptime: process.uptime(),
          requests_total: fastify.server.requestsReceived || 0,
        },
        opensearch: {
          queries_total: searchMetrics.totalQueries,
          query_time_total: searchMetrics.totalQueryTime,
          slow_queries_total: searchMetrics.slowQueries,
          errors_total: searchMetrics.errors,
          timeouts_total: searchMetrics.timeouts,
          avg_query_time: Math.round(avgQueryTime * 100) / 100,
        },
      };
    }
  );
}

export default fp(monitoringPlugin, {
  name: "monitoring",
  dependencies: ["opensearch"],
});
