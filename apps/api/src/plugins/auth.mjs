import fp from "fastify-plugin";
import jwt from "jsonwebtoken";

// Auth plugin supporting:
// - Public endpoints (health, openapi, docs root, login)
// - API key via x-api-key header (grants role from API_KEY_ROLE env or admin)
// - Bearer JWT tokens (HS256) issued by /login containing { sub, role }

const PUBLIC_PATHS = ["/health", "/openapi.json", "/docs", "/", "/login"];

function isPublic(url) {
  return !!url && (PUBLIC_PATHS.includes(url) || url.startsWith("/docs/"));
}

async function authPlugin(fastify) {
  const { API_KEY, API_KEY_ROLE, API_JWT_SECRET } = process.env;
  const JWT_SECRET = API_JWT_SECRET || "dev-secret-change"; // advise override in production

  fastify.decorate("issueToken", (user) => {
    const payload = { sub: String(user.id), role: user.role };
    return jwt.sign(payload, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: "12h",
    });
  });

  fastify.addHook("onRequest", async (req, reply) => {
    const url = req.raw.url.split("?")[0];
    if (isPublic(url)) return; // no auth required

    const apiKey = req.headers["x-api-key"]; // mutual exclusive with bearer
    const auth = req.headers["authorization"]; // Bearer <token>

    if (apiKey && auth) {
      return reply.code(400).send({
        error: {
          code: "multiple_auth_methods",
          message: "Provide only one auth method",
          request_id: req.id,
        },
      });
    }

    if (apiKey) {
      if (!API_KEY || apiKey !== API_KEY) {
        return reply.code(401).send({
          error: {
            code: "unauthorized",
            message: "Invalid API key",
            request_id: req.id,
          },
        });
      }
      req.currentRole = API_KEY_ROLE || "admin";
      req.authSubject = "api-key";
      return; // success
    }

    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET, {
          algorithms: ["HS256"],
        });
        req.currentRole = decoded.role;
        req.authSubject = decoded.sub;
        return;
      } catch (e) {
        return reply.code(401).send({
          error: {
            code: "invalid_token",
            message: "Invalid or expired token",
            request_id: req.id,
          },
        });
      }
    }

    return reply.code(401).send({
      error: {
        code: "unauthorized",
        message: "Authentication required",
        request_id: req.id,
      },
    });
  });
}

export default fp(authPlugin, { name: "auth" });
