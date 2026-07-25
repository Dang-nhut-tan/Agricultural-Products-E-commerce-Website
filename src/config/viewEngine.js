const path = require("path");
const express = require("express");
const nunjucks = require("nunjucks");

const configViewEngine = (app) => {
  const viewsPath = path.join(__dirname, "..", "views");

  app.set("views", viewsPath);
  app.set("view engine", "njk");
  nunjucks.configure(viewsPath, {
    autoescape: true,
    express: app,
    noCache: process.env.NODE_ENV !== "production",
  });
  app.use(express.static(path.join(__dirname, "..", "public")));
};

module.exports = configViewEngine;
