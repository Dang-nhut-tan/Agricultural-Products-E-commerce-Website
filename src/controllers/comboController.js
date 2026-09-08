const comboService = require("../services/comboService");

async function list(req, res) {
  const combos = await comboService.findCombos();

  return res.json({
    data: combos,
  });
}

async function detail(req, res) {
  const comboId = Number(req.params.id);
  const combos = await comboService.findCombos({ id: comboId });
  const combo = combos[0];

  if (!combo) {
    return res.status(404).json({
      message: "Combo không tồn tại hoặc đang tạm hết hàng.",
    });
  }

  return res.json({
    data: combo,
  });
}

module.exports = {
  list: list,
  detail: detail,
};
