const { findCombos } = require("../services/comboService");

async function list(req, res) {
  res.json({ data: await findCombos() });
}

async function detail(req, res) {
  const [combo] = await findCombos({ id: Number(req.params.id) });
  if (!combo) return res.status(404).json({ message: "Combo không tồn tại hoặc đang tạm hết hàng." });
  return res.json({ data: combo });
}

module.exports = { list, detail };
