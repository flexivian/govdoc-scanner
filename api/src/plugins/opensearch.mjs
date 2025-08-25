import fp from "fastify-plugin";
import "../../../shared/config/index.mjs";
import { buildOpenSearchClient } from "../../../shared/opensearch/client.mjs";

async function opensearchPlugin(fastify, opts) {
  const {
    OPENSEARCH_URL: endpoint,
    OPENSEARCH_USERNAME: username,
    OPENSEARCH_PASSWORD: password,
    OPENSEARCH_INSECURE,
    API_OS_REQUEST_TIMEOUT_MS,
  } = process.env;

  if (!endpoint) {
    fastify.log.warn(
      "OPENSEARCH_URL not set; search routes will fail until configured"
    );
    fastify.decorate("opensearch", null);
    return;
  }
  try {
    const client = buildOpenSearchClient({
      endpoint,
      username,
      password,
      insecure: OPENSEARCH_INSECURE === "true",
      requestTimeout: parseInt(API_OS_REQUEST_TIMEOUT_MS || "5000", 10),
    });
    let degraded = false;
    try {
      await client.transport.request({ method: "GET", path: "/" });
      fastify.log.info("Connected to OpenSearch");
    } catch (pingErr) {
      // If credentials have limited perms, a 401/403 on root path is acceptable; mark degraded but keep client.
      if ([401, 403].includes(pingErr?.statusCode)) {
        degraded = true;
        fastify.log.warn(
          { statusCode: pingErr.statusCode },
          "OpenSearch ping unauthorized/forbidden; proceeding in degraded mode"
        );
      } else {
        throw pingErr;
      }
    }
    fastify.decorate("opensearch", client);
    fastify.decorate("opensearchDegraded", degraded);
  } catch (e) {
    fastify.log.warn(
      { err: e },
      "Failed to establish OpenSearch client; search routes disabled"
    );
    fastify.decorate("opensearch", null);
    fastify.decorate("opensearchDegraded", true);
  }
}

export default fp(opensearchPlugin, { name: "opensearch" });
