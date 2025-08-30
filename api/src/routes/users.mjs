import { initUserStore } from "../services/user-store.mjs";

let storePromise;

export default async function usersRoute(fastify) {
  if (!storePromise) storePromise = initUserStore();
  const store = await storePromise;
  function requireAdmin(req, reply) {
    if (req.currentRole !== "admin") {
      reply.code(403).send({
        error: {
          code: "forbidden",
          message: "Admin role required",
          request_id: req.id,
        },
      });
      return false;
    }
    return true;
  }
  fastify.addSchema({
    $id: "User",
    type: "object",
    properties: {
      id: { type: "number" },
      username: { type: "string" },
      role: { type: "string" },
    },
  });

  fastify.get(
    "/users",
    {
      schema: {
  summary: "List users (admin)",
  tags: ["users"],
        response: {
          200: {
            type: "object",
            properties: {
              data: { type: "array", items: { $ref: "User#" } },
              meta: {
                type: "object",
                properties: {
                  total: { type: "number" },
                  request_id: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (req) => {
      const list = store.list();
      return { data: list, meta: { total: list.length, request_id: req.id } };
    }
  );

  fastify.post(
    "/users",
    {
      schema: {
  summary: "Create user (admin)",
  tags: ["users"],
        body: {
          type: "object",
          required: ["username", "password", "role"],
          properties: {
            username: { type: "string", minLength: 3 },
            password: { type: "string", minLength: 6 },
            role: { type: "string", enum: ["admin", "reader"] },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              data: { $ref: "User#" },
              meta: {
                type: "object",
                properties: { request_id: { type: "string" } },
              },
            },
          },
          409: { $ref: "Error#" },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const { username, password, role } = req.body;
      try {
        const user = await store.create({ username, password, role });
        reply.code(201);
        return { data: user, meta: { request_id: req.id } };
      } catch (e) {
        if (e.message === "user_exists") {
          return reply.code(409).send({
            error: {
              code: "user_exists",
              message: "User already exists",
              request_id: req.id,
            },
          });
        }
        throw e;
      }
    }
  );

  // Password change (self or admin). For simplicity, only admin allowed for now.
  fastify.post(
    "/users/:id/password",
    {
      schema: {
  summary: "Change password (admin)",
  tags: ["users"],
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "integer" } },
        },
        body: {
          type: "object",
          required: ["password"],
          properties: { password: { type: "string", minLength: 6 } },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: { $ref: "User#" },
              meta: {
                type: "object",
                properties: { request_id: { type: "string" } },
              },
            },
          },
          404: { $ref: "Error#" },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const id = Number(req.params.id);
      const updated = await store.update(id, { password: req.body.password });
      if (!updated)
        return reply.code(404).send({
          error: {
            code: "not_found",
            message: "User not found",
            request_id: req.id,
          },
        });
      return { data: updated, meta: { request_id: req.id } };
    }
  );

  // Login endpoint: public (auth plugin marks /login as public) verify credentials and issue JWT token
  fastify.post(
    "/login",
    {
      schema: {
        description:
          "Login with username and password to receive a JWT token. The token expires in 12 hours and can be used with 'Authorization: Bearer <token>' header for API access.",
        tags: ["auth"],
        summary: "User login - get JWT token",
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string" },
            password: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "object",
                properties: {
                  username: { type: "string" },
                  role: { type: "string" },
                  token: { type: "string" },
                },
              },
              meta: {
                type: "object",
                properties: {
                  request_id: { type: "string" },
                  expires_in: {
                    type: "integer",
                    description: "Seconds until token expiration",
                  },
                },
              },
            },
          },
          401: { $ref: "Error#" },
        },
      },
    },
    async (req, reply) => {
      const { username, password } = req.body;
      const verified = store.verify(username, password);
      if (!verified)
        return reply.code(401).send({
          error: {
            code: "invalid_credentials",
            message: "Invalid credentials",
            request_id: req.id,
          },
        });
      const token = fastify.issueToken({
        id: verified.id,
        role: verified.role,
      });
      const expiresInSeconds = 12 * 60 * 60; // keep in sync with issueToken
      return {
        data: { username: verified.username, role: verified.role, token },
        meta: { request_id: req.id, expires_in: expiresInSeconds },
      };
    }
  );

  fastify.put(
    "/users/:id",
    {
      schema: {
  summary: "Update user (admin)",
  tags: ["users"],
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "integer" } },
        },
        body: {
          type: "object",
          properties: {
            username: { type: "string", minLength: 3 },
            role: { type: "string", enum: ["admin", "reader"] },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: { $ref: "User#" },
              meta: {
                type: "object",
                properties: { request_id: { type: "string" } },
              },
            },
          },
          404: { $ref: "Error#" },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const id = Number(req.params.id);
      const { username, password, role } = req.body;
      const updated = await store.update(id, { username, password, role });
      if (!updated)
        return reply.code(404).send({
          error: {
            code: "not_found",
            message: "User not found",
            request_id: req.id,
          },
        });
      return { data: updated, meta: { request_id: req.id } };
    }
  );

  fastify.delete(
    "/users/:id",
    {
      schema: {
  summary: "Delete user (admin)",
  tags: ["users"],
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "integer" } },
        },
        response: {
          204: { type: "null" },
          404: { $ref: "Error#" },
        },
      },
    },
    async (req, reply) => {
      if (!requireAdmin(req, reply)) return;
      const id = Number(req.params.id);
      const ok = await store.delete(id);
      if (!ok)
        return reply.code(404).send({
          error: {
            code: "not_found",
            message: "User not found",
            request_id: req.id,
          },
        });
      reply.code(204);
      return null;
    }
  );
}
