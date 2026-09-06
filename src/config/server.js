require("dotenv").config();

module.exports = {
  hostname: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT) || 3000,
};
