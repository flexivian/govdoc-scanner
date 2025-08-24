import { Client } from "@opensearch-project/opensearch";

export function buildOpenSearchClient({
  endpoint,
  username,
  password,
  insecure = false,
  requestTimeout = 5000,
  maxRetries = 3,
  compression = true,
} = {}) {
  if (!endpoint) throw new Error("OpenSearch endpoint missing");

  const opts = {
    node: endpoint,
    requestTimeout,
    maxRetries,
    compression,
    // Connection pool settings
    maxConnections: 10,
    deadTimeout: 60000, // 1 minute before retrying dead nodes
    pingTimeout: 3000,
    // Retry configuration
    sniffOnStart: false,
    sniffInterval: false,
    sniffOnConnectionFault: true,
  };

  if (username || password) {
    opts.auth = { username: username || "", password: password || "" };
  }

  if (endpoint.startsWith("https://")) {
    opts.ssl = {
      rejectUnauthorized: !insecure,
      // Additional SSL options for production
      secureProtocol: "TLSv1_2_method",
    };
  }

  // Add request/response logging in development
  if (process.env.NODE_ENV === "development") {
    opts.log = "debug";
  }

  return new Client(opts);
}

export default buildOpenSearchClient;
