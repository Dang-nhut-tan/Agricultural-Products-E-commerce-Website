const path = require("path");
const { spawn } = require("child_process");
const db = require("../models");
const { embedText, generateJson } = require("./geminiService");

const normalize = (value) => String(value || "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();

function localRecipe(query, products) {
  const text = normalize(query);
  const isNoodle = text.includes("mi xao") || text.includes("mì xào");
  const definitions = isNoodle ? {
    name: "Mì xào bò",
    ingredients: [
      ["Thịt bò", "300 g", ["thit bo"]], ["Mì trứng", "300 g", ["mi"]],
      ["Hành tây", "1 củ", ["hanh tay"]], ["Rau cần", "200 g", ["rau can"]],
      ["Tỏi", "3 tép", ["toi"]], ["Dầu ăn, nước tương, tiêu", "vừa đủ", []],
    ],
    steps: [
      "Thái mỏng thịt bò, ướp với nước tương, tỏi và tiêu khoảng 15 phút.",
      "Trụng mì vừa chín, xả nhanh với nước mát rồi để ráo.",
      "Phi thơm tỏi, xào thịt bò trên lửa lớn đến vừa chín rồi trút ra đĩa.",
      "Xào hành tây và rau cần, cho mì vào đảo cùng gia vị.",
      "Cho thịt bò trở lại chảo, đảo nhanh 1-2 phút rồi dùng nóng.",
    ],
  } : {
    name: "Lẩu bò",
    ingredients: [
      ["Thịt bò ba chỉ", "500 g", ["thit bo ba chi"]], ["Xương ống bò", "1 kg", ["xuong ong bo"]],
      ["Cải thảo", "500 g", ["cai thao"]], ["Nấm hương", "300 g", ["nam huong"]],
      ["Nấm kim châm", "2 gói", ["nam kim cham"]], ["Hành tây", "1 củ", ["hanh tay"]],
      ["Gừng, sả, tỏi và gia vị", "vừa đủ", []],
    ],
    steps: [
      "Chần xương bò 3-5 phút, rửa sạch rồi ninh với gừng và hành tây khoảng 60-90 phút.",
      "Vớt bọt thường xuyên, nêm nước mắm, muối và một ít đường cho nước dùng đậm vị.",
      "Rửa sạch rau nấm; thái thịt bò mỏng và giữ lạnh đến khi ăn.",
      "Đun sôi nước dùng trên bếp lẩu, cho nấm và cải thảo vào trước.",
      "Nhúng thịt bò từng phần đến khi chín, dùng nóng cùng rau và nước chấm.",
    ],
  };

  const usedIds = new Set();
  const ingredients = definitions.ingredients.map(([name, amount, aliases]) => {
    const product = products.find((item) => !usedIds.has(item.id) && aliases.some((alias) => normalize(item.name).includes(alias)));
    if (product) usedIds.add(product.id);
    return { name, amount, productId: product?.id || null };
  });
  const byId = new Map(products.map((product) => [Number(product.id), product]));
  const matchedProducts = ingredients.map((ingredient) => {
    const product = byId.get(Number(ingredient.productId));
    return product ? { ...product, ingredientName: ingredient.name, suggestedAmount: ingredient.amount } : null;
  }).filter(Boolean);
  return {
    name: definitions.name,
    summary: "Công thức dự phòng từ dữ liệu cửa hàng khi trợ lý AI đang giới hạn lượt dùng.",
    ingredients,
    steps: definitions.steps,
    safetyNotes: ["Rửa sạch rau nấm và nấu chín thịt bò phù hợp trước khi dùng.", "Kiểm tra thành phần nếu bạn có tiền sử dị ứng thực phẩm."],
    missingIngredients: ingredients.filter((item) => !item.productId).map((item) => item.name),
    products: matchedProducts,
    image: "",
  };
}

const recipeSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    summary: { type: "string" },
    ingredients: { type: "array", items: { type: "object", properties: {
      name: { type: "string" }, amount: { type: "string" }, productId: { type: "integer", nullable: true },
    }, required: ["name", "amount", "productId"] } },
    steps: { type: "array", items: { type: "string" } },
    safetyNotes: { type: "array", items: { type: "string" } },
    missingIngredients: { type: "array", items: { type: "string" } },
  }, required: ["name", "summary", "ingredients", "steps", "safetyNotes", "missingIngredients"],
};

function queryFaiss(vector, limit = 5) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, "..", "scripts", "query_recipe_index.py");
    const child = spawn(process.env.PYTHON_BIN || "python", [script, String(limit)], { cwd: path.join(__dirname, "..", "..") });
    let output = "", error = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { error += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(JSON.parse(output || "[]")) : reject(Object.assign(new Error(error || "Chưa có chỉ mục công thức."), { status: 503 })));
    child.stdin.end(JSON.stringify(vector));
  });
}

async function suggestRecipe(query, filters = {}) {
  let references = [];
  try {
    const vector = await embedText(query);
    references = await queryFaiss(vector);
  } catch (error) {
    console.warn("Không dùng được FAISS embedding, chuyển sang công thức cục bộ:", error.message);
  }
  const products = await db.Product.findAll({
    where: { status: 1, quantity: { [db.Sequelize.Op.gt]: 0 } },
    include: [{ model: db.Category }, { model: db.ProductImage, required: false }],
    order: [["quantity", "DESC"]],
  });
  const plainProducts = products.map((item) => item.get({ plain: true }));
  const links = await db.RecipeProductLink.findAll({ include: [db.Product], order: [["priority", "DESC"]] });
  const prompt = `Bạn là bếp trưởng Việt Nam cho website nông sản. Hãy trả về đúng một công thức phù hợp yêu cầu.
Yêu cầu: ${query}
Bộ lọc: ${JSON.stringify(filters)}
Tư liệu tìm từ FAISS: ${JSON.stringify(references)}
Sản phẩm đang còn hàng (chỉ được dùng id trong danh sách này cho productId): ${JSON.stringify(plainProducts.map((p) => ({ id: p.id, name: p.name, unit: p.unit, quantity: p.quantity })))}
Liên kết do quản trị viên đặt: ${JSON.stringify(links.map((l) => ({ ingredient: l.ingredient_name, aliases: l.aliases, productId: l.product_id })))}
Ưu tiên tư liệu, nhưng được bổ sung kiến thức phổ biến. Ghép tên gần nghĩa. Nguyên liệu không có hàng phải có productId=null và xuất hiện trong missingIngredients. Chỉ viết nguyên liệu và các bước nấu, kèm cảnh báo dị ứng/vệ sinh/an toàn nhiệt độ. Không đưa thông tin y tế tuyệt đối.`;
  let recipe;
  try {
    recipe = await generateJson(prompt, recipeSchema);
  } catch (error) {
    console.warn("Không dùng được Gemini recipe, chuyển sang công thức cục bộ:", error.message);
    return localRecipe(query, plainProducts);
  }
  const byId = new Map(plainProducts.map((product) => [Number(product.id), product]));
  recipe.products = recipe.ingredients.map((ingredient) => {
    const product = byId.get(Number(ingredient.productId));
    return product ? { ...product, ingredientName: ingredient.name, suggestedAmount: ingredient.amount } : null;
  }).filter(Boolean);
  const managedRecipe = await db.Recipe.findOne({ where: { name: recipe.name, active: true }, attributes: ["image"] });
  recipe.image = managedRecipe?.image
    || recipe.products.map((product) => product.image || product.ProductImages?.[0]?.image).find(Boolean) || "";
  return recipe;
}

module.exports = { suggestRecipe, localRecipe };
