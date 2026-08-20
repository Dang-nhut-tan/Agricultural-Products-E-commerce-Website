const { spawn } = require("child_process");
const path = require("path");
const db = require("../models");

let running = false;
let rebuildAgain = false;

async function setStatus(status, errorMessage = null) {
  await db.RecipeSource.update(
    { status, error_message: errorMessage },
    { where: {} },
  ).catch((error) => console.warn("Không thể cập nhật trạng thái PDF:", error.message));
}

async function rebuildRecipeIndex() {
  if (running) {
    rebuildAgain = true;
    return;
  }

  running = true;
  await setStatus("processing");
  const script = path.join(__dirname, "..", "scripts", "build_recipe_index.py");
  const child = spawn(process.env.PYTHON_BIN || "python", [script, "--reset"], {
    cwd: path.join(__dirname, "..", ".."),
  });
  let errorOutput = "";

  child.stdout.on("data", (chunk) => console.log(String(chunk).trim()));
  child.stderr.on("data", (chunk) => { errorOutput += chunk; });
  child.on("error", async (error) => {
    await setStatus("error", error.message);
    running = false;
  });
  child.on("close", async (code) => {
    if (code === 0) await setStatus("ready");
    else await setStatus("error", errorOutput.trim().slice(0, 2000) || "Không thể tạo chỉ mục.");
    running = false;
    if (rebuildAgain) {
      rebuildAgain = false;
      rebuildRecipeIndex();
    }
  });
}

module.exports = { rebuildRecipeIndex };
