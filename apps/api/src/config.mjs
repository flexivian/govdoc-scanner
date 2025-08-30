export const apiConfig = {
  port: parseInt(process.env.API_PORT || "8080", 10),
  host: process.env.API_HOST || "0.0.0.0",
  fastify: {
    logger: false,
    bodyLimit: parseInt(process.env.API_MAX_BODY_BYTES || `${1_000_000}`, 10),
  },
};

export default apiConfig;
