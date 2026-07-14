const path = require("path");

const indexPage = path.join(__dirname, "..", "views", "index.html");

function getIndexPage(req, res) {
  res.sendFile(indexPage);
}

module.exports = { getIndexPage };
