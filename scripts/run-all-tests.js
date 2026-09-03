const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env"), quiet: true });
const bin = (name) => path.join(root, "node_modules", ".bin", `${name}${process.platform === "win32" ? ".cmd" : ""}`);
const run = (title, command, args, env = process.env, useShell = false, continueOnFailure = false) => {
  console.log(`\n=== ${title} ===`);
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    stdio: "inherit",
    shell: useShell,
  });
  if (result.error) {
    if (continueOnFailure) return { ok: false, message: result.error.message };
    throw result.error;
  }
  if (result.status !== 0) {
    const message = `${title} thất bại với mã ${result.status}.`;
    if (continueOnFailure) return { ok: false, message };
    throw new Error(message);
  }
  return { ok: true };
};

const waitForServer = async (timeoutMs = 120000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch("http://127.0.0.1:3000/api/categories");
      if (response.ok) return;
    } catch (_error) {
      // Server vẫn đang khởi động.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Server không khởi động được trong 120 giây.");
};

const stopServer = async (server) => {
  if (!server || server.exitCode !== null) return;
  server.kill();
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
};

const findJavaHome = () => {
  const candidates = [process.env.JAVA_HOME];
  if (process.platform === "win32") {
    candidates.push("C:\\Program Files\\Android\\Android Studio\\jbr");
    const jetBrains = "C:\\Program Files\\JetBrains";
    if (fs.existsSync(jetBrains)) {
      for (const folder of fs.readdirSync(jetBrains)) candidates.push(path.join(jetBrains, folder, "jbr"));
    }
  }
  return candidates.find((home) => home && fs.existsSync(path.join(home, "bin", process.platform === "win32" ? "java.exe" : "java")));
};

(async () => {
  let newmanServer;
  const testFailures = [];
  try {
    fs.rmSync(path.join(root, "allure-results"), { recursive: true, force: true });
    fs.rmSync(path.join(root, "allure-report"), { recursive: true, force: true });

    const jestResult = run("Kiểm thử đơn vị Jest", process.execPath, [path.join(root, "node_modules", "jest", "bin", "jest.js"), "--runInBand"], process.env, false, true);
    if (!jestResult.ok) testFailures.push(jestResult.message);

    let reusedServer = false;
    try {
      const response = await fetch("http://127.0.0.1:3000/api/categories");
      reusedServer = response.ok;
    } catch (_error) {
      reusedServer = false;
    }
    if (!reusedServer) {
      console.log("\n=== Khởi động server cho Newman ===");
      newmanServer = spawn(process.execPath, [path.join(root, "src", "index.js")], {
        cwd: root,
        env: { ...process.env, NODE_ENV: "test" },
        stdio: "inherit",
      });
      await waitForServer();
    }

    const newmanResult = run("Kiểm thử API Newman", process.execPath, [
      path.join(root, "node_modules", "newman", "bin", "newman.js"),
      "run", path.join("api-testing-project", "collections", "Web Nông Sản API.postman_collection.json"),
      "-e", path.join("api-testing-project", "environments", "web-nong-san-api.postman_environment.json"),
      "--env-var", `adminEmail=${process.env.ADMIN_EMAIL || "admin@example.com"}`,
      "--env-var", `adminPassword=${process.env.ADMIN_PASSWORD || "admin123"}`,
      "-r", "cli,allure",
    ], process.env, false, true);
    if (!newmanResult.ok) testFailures.push(newmanResult.message);

    await stopServer(newmanServer);
    newmanServer = null;
    const playwrightResult = run("Kiểm thử giao diện Playwright", process.execPath, [path.join(root, "node_modules", "@playwright", "test", "cli.js"), "test"], process.env, false, true);
    if (!playwrightResult.ok) testFailures.push(playwrightResult.message);

    const javaHome = findJavaHome();
    const allureEnv = javaHome ? { ...process.env, JAVA_HOME: javaHome } : process.env;
    run("Tạo báo cáo Allure", bin("allure"), ["generate", "allure-results", "--clean", "-o", "allure-report"], allureEnv, process.platform === "win32");

    console.log(`\nHoàn tất. Báo cáo Allure: ${path.join(root, "allure-report", "index.html")}`);
    if (testFailures.length) {
      console.log(`Có ${testFailures.length} bộ kiểm thử có lỗi; chi tiết đã được đưa vào Allure.`);
    }
    if (process.env.ALLURE_NO_OPEN !== "1") {
      console.log("Đang mở báo cáo Allure. Nhấn Ctrl+C để đóng khi xem xong.");
      run("Mở báo cáo Allure", bin("allure"), ["open", "allure-report"], allureEnv, process.platform === "win32");
    }
    if (testFailures.length) process.exitCode = 1;
  } catch (error) {
    console.error(`\nKhông thể hoàn tất kiểm thử: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await stopServer(newmanServer);
  }
})();
