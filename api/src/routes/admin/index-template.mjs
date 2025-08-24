import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

export default async function indexTemplateRoute(fastify) {
  fastify.put(
    "/admin/index-template/init",
    {
      schema: {
        description:
          "Initialize or update the OpenSearch index template for company data. Creates proper field mappings and settings for optimal search performance. Admin access required.",
        tags: ["admin"],
        summary: "Initialize OpenSearch index template",
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "object",
                properties: {
                  created: { type: "boolean" },
                  updated: { type: "boolean" },
                  templateName: { type: "string" },
                  versionDiff: { type: "object", nullable: true },
                },
              },
              meta: {
                type: "object",
                properties: { request_id: { type: "string" } },
              },
            },
          },
          403: { $ref: "Error#" },
          503: { $ref: "Error#" },
        },
      },
    },
    async (req, reply) => {
      // Require admin role
      if (req.currentRole !== "admin") {
        return reply.code(403).send({
          error: {
            code: "forbidden",
            message: "Admin role required",
            request_id: req.id,
          },
        });
      }

      if (!fastify.opensearch)
        return reply.code(503).send({
          error: {
            code: "search_unavailable",
            message: "Search unavailable",
            request_id: req.id,
          },
        });
      // Load template JSON from repo path
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const templatePath = path.resolve(
        __dirname,
        "../../../..",
        "opensearch/shared/templates/company-index-template.json"
      );
      const raw = await fs.readFile(templatePath, "utf-8");
      const templateJson = JSON.parse(raw);
      const templateName = "govdoc-companies-template";

      // Check existing template
      let existing = null;
      try {
        const getResp = await fastify.opensearch.transport.request({
          method: "GET",
          path: `/_index_template/${templateName}`,
        });
        const body = getResp.body || getResp;
        existing = body.index_templates?.[0]?.index_template || null;
      } catch (e) {
        if (e.statusCode !== 404) throw e;
      }

      let created = false;
      let updated = false;
      let versionDiff = null;

      if (!existing) {
        await fastify.opensearch.transport.request({
          method: "PUT",
          path: `/_index_template/${templateName}`,
          body: templateJson,
        });
        created = true;
      } else {
        // Compare shallow version + top-level keys for drift (basic diff)
        const diff = {};
        if (existing.version !== templateJson.version)
          diff.version = { from: existing.version, to: templateJson.version };
        // Could deep compare mappings/settings but keep minimal for milestone.
        if (Object.keys(diff).length > 0) {
          await fastify.opensearch.transport.request({
            method: "PUT",
            path: `/_index_template/${templateName}`,
            body: templateJson,
          });
          updated = true;
          versionDiff = diff;
        }
      }

      return {
        data: { created, updated, templateName, versionDiff },
        meta: { request_id: req.id },
      };
    }
  );
}
