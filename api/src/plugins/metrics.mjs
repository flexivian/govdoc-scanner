import fp from "fastify-plugin";
import client from "prom-client";

async function metricsPlugin(fastify) {
  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry });

  const reqCounter = new client.Counter({
    name: "http_requests_total",
    help: "Total HTTP requests",
    labelNames: ["method", "route", "status"],
    registers: [registry],
  });
  const reqDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Request duration seconds",
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    labelNames: ["method", "route"],
    registers: [registry],
  });

  fastify.addHook("onRequest", async (req, reply) => {
    req._start = process.hrtime.bigint();
  });
  fastify.addHook("onResponse", async (req, reply) => {
    const diffNs = process.hrtime.bigint() - req._start;
    const seconds = Number(diffNs) / 1e9;
    const route = req.routeOptions?.url || req.raw.url.split("?")[0];
    reqCounter.inc({ method: req.method, route, status: reply.statusCode });
    reqDuration.observe({ method: req.method, route }, seconds);
  });

  fastify.get(
    "/metrics",
    {
      schema: {
        description:
          "Prometheus-format metrics including HTTP request counts, response times, memory usage, and Node.js process statistics. Authentication required unless API_METRICS_PUBLIC=true.",
        summary: "Prometheus metrics",
        tags: ["default"],
        response: {
          200: {
            type: "string",
            description: "Prometheus metrics in text format",
          },
        },
      },
      config: { public: process.env.API_METRICS_PUBLIC === "true" },
    },
    async (req, reply) => {
      if (process.env.API_METRICS_PUBLIC === "true") {
        // allow unauthenticated
      } else if (!process.env.API_KEY) {
        return reply.code(401).send({
          error: {
            code: "unauthorized",
            message: "API key not set",
            request_id: req.id,
          },
        });
      }
      reply.header("Content-Type", registry.contentType);
      return registry.metrics();
    }
  );
}

export default fp(metricsPlugin, { name: "metrics" });
