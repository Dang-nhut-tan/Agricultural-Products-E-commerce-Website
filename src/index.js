const express = require("express");
const path = require("path");
const configViewEngine = require("./config/viewEngine");
const serverConfig = require("./config/server");

const app = express();

app.use(express.json());
// là middleware của Express dùng để đọc dữ liệu được gửi từ HTML Form (application/x-www-form-urlencoded) và
// chuyển thành đối tượng JavaScript trong req.body.
app.use(express.urlencoded({ extended: true }));

configViewEngine(app);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "test.html"));
});

app.listen(serverConfig.port, serverConfig.hostname, () => {
  console.log(
    `Server đang chạy ở http://${serverConfig.hostname}:${serverConfig.port}`
  );
});
