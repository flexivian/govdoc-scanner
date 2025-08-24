import fp from "fastify-plugin";
import { createLogger } from "../../shared/logging/index.mjs";
import { randomUUID } from "crypto";

// Adds request-scoped logger with request id propagation.
async function loggingBridge(fastify) {
  const base = createLogger("api");
  fastify.decorate("baseLogger", base);
  fastify.addHook("onRequest", async (req, reply) => {
    let reqId = req.headers["x-request-id"] || randomUUID();
    reply.header("X-Request-Id", reqId);
    req.id = reqId;
    // shared logger doesn't implement pino child; emulate minimal interface
    req.log = base;
  });
}

export default fp(loggingBridge, { name: "logging-bridge" });
