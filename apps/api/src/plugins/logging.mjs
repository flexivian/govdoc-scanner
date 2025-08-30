import fp from "fastify-plugin";
import { createLogger } from "../../../shared/logging/index.mjs";

let requestCounter = 0;

function generateRequestId() {
  // Simple counter with timestamp
  return `req-${Date.now()}-${++requestCounter}`;
}

// Skip logging for static assets
const shouldSkipLogging = (url) => {
  return (
    url.includes("/static/") || url.includes("/favicon") || url.endsWith(".png")
  );
};

// Adds request-scoped logger with request id propagation.
async function loggingBridge(fastify) {
  const base = createLogger("api");
  fastify.decorate("baseLogger", base);

  fastify.addHook("onRequest", async (req, reply) => {
    let reqId = req.headers["x-request-id"] || generateRequestId();
    reply.header("X-Request-Id", reqId);
    req.id = reqId;
    req.log = base;

    // Log incoming request
    if (!shouldSkipLogging(req.url)) {
      const authHeader = req.headers["authorization"]
        ? "Bearer ***"
        : req.headers["x-api-key"]
          ? "API-Key ***"
          : "None";

      base.info(
        `${req.method} ${req.url} - Request ID: ${reqId} - IP: ${req.ip} - Auth: ${authHeader}`
      );
    }
  });

  fastify.addHook("onResponse", async (req, reply) => {
    const responseTime = reply.elapsedTime || 0;
    const statusCode = reply.statusCode;

    // Log completed request
    if (!shouldSkipLogging(req.url)) {
      base.info(
        `${req.method} ${req.url} - ${statusCode} - ${responseTime.toFixed(2)}ms - Request ID: ${req.id}`
      );
    }
  });
}

export default fp(loggingBridge, { name: "logging-bridge" });
