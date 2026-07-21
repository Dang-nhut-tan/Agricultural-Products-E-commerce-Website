const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");

const routesPath = path
  .join(__dirname, "..", "routes", "*.js")
  .replace(/\\/g, "/");

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Web Nông Sản API",
      version: "1.0.0",
      description: "Tài liệu API cho hệ thống Web Nông Sản",
    },
    servers: [
      {
        url: "http://127.0.0.1:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "nong-san.sid",
        },
      },
    },
  },

  apis: [routesPath],
});

module.exports = swaggerSpec;