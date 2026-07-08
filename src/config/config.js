require("dotenv").config();

const config = {
  username: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_DATABASE || "web_nong_san",
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT || 3306,
  dialect: process.env.DB_DIALECT || "mysql",
};

module.exports = {
  development: config,
  test: config,
  production: config,
};
