const { suggestRecipe } = require("../services/recipeSearch");

const allowedFilters = {
  meal: ["", "sáng", "trưa", "tối", "ăn nhẹ"],
  difficulty: ["", "dễ", "vừa", "nâng cao"],
  time: ["", "15", "30", "60", "60+"],
  diet: ["", "không yêu cầu", "chay", "ít béo", "giàu đạm"],
};

async function suggest(req, res, next) {
  try {
    const query = String(req.body.query || "").trim();
    if (query.length < 2 || query.length > 200) return res.status(400).json({ message: "Yêu cầu món ăn phải từ 2 đến 200 ký tự." });
    const filters = {};
    for (const [key, values] of Object.entries(allowedFilters)) {
      const value = String(req.body.filters?.[key] || "").trim().toLowerCase();
      if (!values.includes(value)) return res.status(400).json({ message: `Bộ lọc ${key} không hợp lệ.` });
      if (value) filters[key] = value;
    }
    return res.json({ data: await suggestRecipe(query, filters) });
  } catch (error) { return next(error); }
}

module.exports = { suggest };
