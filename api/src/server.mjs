import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import apiConfig from "./config.mjs";
import healthRoute from "./routes/health.mjs";
import opensearchPlugin from "./plugins/opensearch.mjs";
import loggingBridge from "./plugins/logging.mjs";
import metricsPlugin from "./plugins/metrics.mjs";
import errorHandlerPlugin from "./plugins/error-handler.mjs";
import getCompanyRoute from "./routes/companies/get-company.mjs";
import searchCompaniesRoute from "./routes/companies/search-companies.mjs";
import authPlugin from "./plugins/auth.mjs";
import rateLimitPlugin from "./plugins/rate-limit.mjs";
import representativesSearchRoute from "./routes/companies/representatives-search.mjs";
import usersRoute from "./routes/users.mjs";
import statsRoute from "./routes/admin/stats.mjs";
import indexTemplateRoute from "./routes/admin/index-template.mjs";
import validationPlugin from "./plugins/validation.mjs";
import monitoringPlugin from "./plugins/monitoring.mjs";
import sanitizationPlugin from "./plugins/sanitization.mjs";

async function buildServer() {
  const fastify = Fastify(apiConfig.fastify);

  // Swagger / OpenAPI basic setup
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "GovDoc Scanner API",
        description:
          "API for querying company metadata from document scans. Auth: x-api-key or JWT (12h). Rate limit: 100 req/min. User admin endpoints require admin role.",
        version: "0.1.0",
        contact: {
          name: "API Support",
          email: "tempmail@gmai.com",
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      servers: [
        {
          url: `http://localhost:${apiConfig.port}`,
          description: "Development server",
        },
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
          BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
        schemas: {
          Company: {
            type: "object",
            properties: {
              gemi_id: { type: "string", example: "12345678000" },
              company_name: { type: "string", example: "Example Corp Ltd" },
              company_tax_id: { type: "string", example: "1234567890" },
              creation_date: {
                type: "string",
                format: "date",
                example: "2020-01-15",
              },
              scan_date: {
                type: "string",
                format: "date-time",
                example: "2023-12-01T10:30:00Z",
              },
              registered_address: {
                type: "string",
                example: "123 Main Street, City",
              },
              company_type: { type: "string", example: "Limited Company" },
              competent_gemi_office: {
                type: "string",
                example: "Chamber of Commerce Athens",
              },
              region: { type: "string", example: "Central" },
              city: { type: "string", example: "Athens" },
              postal_code: { type: "string", example: "12345" },
              document_date: {
                type: "string",
                format: "date",
                example: "2023-11-15",
              },
              total_capital_amount: { type: "string", example: "50.000,00€" },
              equity_amount: { type: "string", example: "75.000,00€" },
              total_assets: { type: "string", example: "150.000,00€" },
              total_liabilities: { type: "string", example: "90.000,00€" },
              tracked_company_changes: {
                type: "string",
                example: "• ΠΑΠΑΔΟΠΟΥΛΟΣ ΙΩΑΝΝΗΣ appointed as Διαχειριστής",
                nullable: true,
              },
              tracked_economic_changes: {
                type: "string",
                example:
                  "• Total capital increased from 10.000,00€ to 50.000,00€",
                nullable: true,
              },
              representatives: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", example: "John Doe" },
                    role: { type: "string", example: "CEO" },
                    tax_id: { type: "string", example: "123456789" },
                    is_active: { type: "boolean", example: true },
                    capital_amount: { type: "string", example: "25.000,00€" },
                    capital_percentage: { type: "string", example: "51,50%" },
                  },
                },
              },
              tracked_changes_history: {
                type: "array",
                description:
                  "Historical tracked changes extracted per document. company_changes = governance/structural; economic_changes = capital/ownership/economic. Fields can be null when no changes of that type were detected in that document.",
                items: {
                  type: "object",
                  properties: {
                    file_name: {
                      type: "string",
                      example: "2023-11-15_document.pdf",
                    },
                    doc_date: {
                      type: "string",
                      format: "date",
                      example: "2023-11-15",
                    },
                    company_changes: {
                      type: "string",
                      nullable: true,
                      example:
                        "• Board restructured with new director appointed",
                    },
                    economic_changes: {
                      type: "string",
                      nullable: true,
                      example:
                        "• Share capital increased from 10.000,00€ to 50.000,00€",
                    },
                  },
                },
              },
              raw: {
                type: "object",
                description: "Original source metadata",
                properties: {
                  source: { type: "string", example: "cli" },
                  version: { type: "integer", example: 3 },
                },
              },
            },
            required: ["gemi_id", "company_name", "scan_date"],
          },
        },
      },
      security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    },
  });
  // Expose JSON at /openapi.json
  fastify.get(
    "/openapi.json",
    {
      schema: {
        summary: "OpenAPI specification JSON",
        tags: ["default"],
        response: {
          200: {
            type: "object",
            description: "OpenAPI 3.0 spec object",
          },
        },
      },
    },
    async () => fastify.swagger()
  );

  await fastify.register(swaggerUI, { routePrefix: "/docs" });

  await fastify.register(loggingBridge);
  await fastify.register(metricsPlugin);
  await fastify.register(validationPlugin);
  await fastify.register(sanitizationPlugin);
  await fastify.register(opensearchPlugin);
  await fastify.register(monitoringPlugin);
  await fastify.register(rateLimitPlugin);
  await fastify.register(authPlugin); // Auth after rate limit so 401 still counts toward usage
  // Enforce JSON content-type for mutating routes
  fastify.addHook("preHandler", async (req, reply) => {
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      const ct = req.headers["content-type"] || "";
      if (!/^application\/json/i.test(ct)) {
        return reply.code(415).send({
          error: {
            code: "unsupported_media_type",
            message: "Content-Type must be application/json",
            request_id: req.id,
          },
        });
      }
    }
  });
  await fastify.register(healthRoute);
  await fastify.register(getCompanyRoute);
  await fastify.register(searchCompaniesRoute);
  await fastify.register(representativesSearchRoute);
  await fastify.register(usersRoute);
  await fastify.register(statsRoute);
  await fastify.register(indexTemplateRoute);
  await fastify.register(errorHandlerPlugin); // last so it catches route errors

  fastify.get(
    "/",
    {
      schema: {
        summary: "API status",
        tags: ["default"],
        response: {
          200: {
            type: "object",
            properties: {
              name: { type: "string", example: "govdoc-scanner-api" },
              status: { type: "string", example: "ok" },
            },
          },
        },
      },
    },
    async () => ({ name: "govdoc-scanner-api", status: "ok" })
  );

  return fastify;
}

async function start() {
  const server = await buildServer();
  try {
    await server.listen({ port: apiConfig.port, host: apiConfig.host });
    server.log.info(`API listening on ${apiConfig.host}:${apiConfig.port}`);
  } catch (err) {
    server.log.error(err, "Failed to start server");
    process.exit(1);
  }

  const shutdown = async (signal) => {
    server.log.info({ signal }, "Shutting down API");
    try {
      await server.close();
      process.exit(0);
    } catch (e) {
      server.log.error(e, "Error during shutdown");
      process.exit(1);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export default buildServer;
