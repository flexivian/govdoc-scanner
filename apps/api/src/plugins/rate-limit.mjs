import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";

// Global rate limit 100/min. Skip /health, /openapi.json, /docs assets, root.

async function rateLimitPlugin(fastify) {
  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: (req) => req.headers["x-api-key"] || req.ip,
    allowList: (req) => {
      const url = req.raw.url.split("?")[0];
      return (
        url === "/health" ||
        url === "/openapi.json" ||
        url === "/" ||
        url.startsWith("/docs")
      ); // do not allowlist /login so it is counted
    },
  });
}

export default fp(rateLimitPlugin, { name: "rate-limit" });
