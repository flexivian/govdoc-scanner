import fp from "fastify-plugin";

async function errorHandlerPlugin(fastify) {
  fastify.setErrorHandler((err, req, reply) => {
    const status = err.statusCode || 500;
    const code = err.code || err.validation?.[0]?.keyword || "internal_error";
    const message = err.validation
      ? "validation_failed"
      : err.message || "Internal Server Error";
    if (status >= 500)
      fastify.log.error({ err, reqId: req.id }, "request failed");
    reply.code(status).send({ error: { code, message, request_id: req.id } });
  });
}

export default fp(errorHandlerPlugin, { name: "error-handler" });
