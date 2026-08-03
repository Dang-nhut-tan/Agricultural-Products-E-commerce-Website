const db = require("../models");
const { generateJson } = require("../services/geminiService");
const ChatReq = require("../dtos/request/chat/chatReq");
const ChatRespone = require("../dtos/respone/chat/chatRespone");
const { suggestRecipe } = require("../services/recipeSearch");

const normalize = (value) => String(value || "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

// Câu trả lời dự phòng giúp chatbot vẫn dùng được khi Gemini hết quota hoặc mất kết nối.
function localReply(message, products) {
  const question = normalize(message);
  const selected = selectProducts(message, products);

  if (question.includes("dat hang") || question.includes("mua hang")) {
    return "Bạn chọn sản phẩm, nhấn dấu + để thêm vào giỏ, mở giỏ hàng để điều chỉnh số lượng, sau đó chọn Thanh toán. Bạn cần đăng nhập và có địa chỉ nhận hàng trước khi thanh toán.";
  }
  if (question.includes("phi giao") || question.includes("van chuyen")) {
    return "Phí giao hàng chính xác sẽ được hiển thị ở bước thanh toán sau khi bạn chọn địa chỉ nhận hàng.";
  }
  if (question.includes("nau") || question.includes("an gi") || question.includes("mon")) {
    const suggestions = selected.slice(0, 4).map((product) => product.name).join(", ");
    return `Bạn có thể dùng ô “Bạn muốn nấu món gì?” trên trang chủ để nhận công thức chi tiết. Một số nguyên liệu đang còn hàng: ${suggestions || "chưa có sản phẩm phù hợp"}.`;
  }
  if (!selected.length) return "Hiện cửa hàng chưa có sản phẩm còn hàng phù hợp với câu hỏi của bạn.";
  return "Một số sản phẩm đang còn hàng:\n" + selected.map((product) =>
    `• ${product.name}: ${money(product.price)}, còn ${product.quantity} ${product.unit || "sản phẩm"} — /san-pham/${product.id}`
  ).join("\n");
}

function selectProducts(message, products) {
  const question = normalize(message);
  const available = products.filter((product) => Number(product.quantity) > 0);
  const matched = available.filter((product) => normalize(product.name).split(/\s+/)
    .some((word) => word.length > 2 && question.includes(word)));
  const isGenericBrowse = ["co gi", "san pham nao", "danh sach san pham", "tim san pham"]
    .some((phrase) => question.includes(phrase));
  return (matched.length ? matched : isGenericBrowse ? available : []).slice(0, 6);
}

const isCookingQuestion = (message) => [
  "nau", "cong thuc", "mon", "an gi", "che bien", "lau", "xao", "canh",
  "kho", "nuong", "hap", "chien", "rang", "goi", "nom", "soup", "salad",
]
  .some((keyword) => normalize(message).includes(keyword));

async function reply(req, res) {
  const chat = new ChatReq(req.body);
  const message = chat.message;

  // Câu hỏi nấu ăn phải dùng pipeline công thức, không dùng chatbot sản phẩm chung.
  if (isCookingQuestion(message)) {
    try {
      const recipe = await suggestRecipe(message, {});
      const answer = `Mình gợi ý món ${recipe.name}. Dưới đây là nguyên liệu, cách nấu và sản phẩm phù hợp đang còn hàng.`;
      return res.json({ data: new ChatRespone(answer, recipe.products, recipe) });
    } catch (error) {
      console.warn("Không thể tạo công thức trong chatbot:", error.message);
      return res.json({ data: new ChatRespone(
        "Mình chưa tạo được công thức lúc này. Bạn có thể thử lại sau; mình sẽ không đề xuất sản phẩm không liên quan.",
        [],
      ) });
    }
  }

  // Chỉ gửi một phần lịch sử gần nhất lên Gemini; không lưu hội thoại vào database.
  const history = chat.history.slice(-8);
  const contents = history
    .filter((item) => ["user", "model"].includes(item?.role) && typeof item.text === "string")
    .map((item) => ({ role: item.role, parts: [{ text: item.text.slice(0, 1000) }] }));
  contents.push({ role: "user", parts: [{ text: message }] });

  const products = await db.Product.findAll({
    where: { status: 1 },
    attributes: ["id", "name", "price", "oldprice", "image", "quantity", "unit", "origin"],
    include: [{ model: db.ProductImage, required: false }],
    order: [["quantity", "DESC"]],
    limit: 80,
  });
  const catalog = products.map((product) => product.get({ plain: true }));
  const systemInstruction = `Bạn là Trợ lý Nông Sản Xanh trên website bán nông sản Việt Nam.
- Trả lời ngắn gọn, thân thiện, hoàn toàn bằng tiếng Việt.
- Chỉ khẳng định giá và tồn kho dựa trên danh sách sản phẩm bên dưới.
- Khi giới thiệu sản phẩm, ghi tên, giá, số lượng còn và đường dẫn /san-pham/{id}.
- Có thể tư vấn món ăn và cách đặt hàng. Nếu người dùng cần công thức chi tiết, hướng dẫn họ dùng ô "Bạn muốn nấu món gì?" trên trang chủ.
- Không bịa chính sách vận chuyển, khuyến mãi hay thông tin sản phẩm không có trong dữ liệu.
- Với dị ứng hoặc an toàn thực phẩm, luôn nhắc người dùng kiểm tra nhãn và nấu chín phù hợp.
Sản phẩm hiện tại: ${JSON.stringify(catalog)}`;

  let answer;
  let selectedProducts;
  try {
    const result = await generateJson(`${systemInstruction}
Lịch sử và câu hỏi: ${JSON.stringify(contents)}
Trả lời câu hỏi và chọn tối đa 6 productIds phù hợp để khách có thể thêm vào giỏ. Chỉ chọn ID có trong danh sách và quantity > 0.
Phần answer chỉ trả lời ngắn gọn trong 2-4 câu. Không lặp lại danh sách sản phẩm, giá, tồn kho, ID hay URL vì giao diện sẽ tự hiển thị thẻ sản phẩm bên dưới.`, {
      type: "object",
      properties: {
        answer: { type: "string" },
        productIds: { type: "array", items: { type: "integer" } },
      },
      required: ["answer", "productIds"],
    });
    answer = result.answer;
    const ids = new Set(result.productIds.map(Number));
    selectedProducts = catalog.filter((product) => ids.has(Number(product.id)) && Number(product.quantity) > 0).slice(0, 6);
    if (!selectedProducts.length) selectedProducts = selectProducts(message, catalog);
  } catch (error) {
    console.warn("Chatbot chuyển sang dữ liệu dự phòng:", error.message);
    answer = localReply(message, catalog);
    selectedProducts = selectProducts(message, catalog);
  }
  return res.json({ data: new ChatRespone(answer, selectedProducts) });
}

module.exports = { reply, localReply, selectProducts, isCookingQuestion };
