import React, { useEffect, useMemo, useState } from "react";
import { ApiClient } from "adminjs";
import { Box, Button, H2, Label, MessageBox } from "@adminjs/design-system";

const api = new ApiClient();

const inputStyle = {
  width: "100%", padding: "10px 12px", border: "1px solid #c9d5cf",
  borderRadius: 6, marginTop: 6, boxSizing: "border-box",
};

const QuickCombo = () => {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState({});
  const [form, setForm] = useState({ name: "", description: "", size: "small", discount_value: 10 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    api.resourceAction({ resourceId: "combos", actionName: "quickNew" })
      .then(({ data }) => setProducts(data.products || []))
      .catch(() => setNotice({ type: "danger", message: "Không tải được danh sách sản phẩm." }))
      .finally(() => setLoading(false));
  }, []);

  const items = useMemo(() => Object.entries(selected)
    .filter(([, quantity]) => Number(quantity) > 0)
    .map(([productId, quantity]) => ({ product_id: Number(productId), base_quantity: Number(quantity) })), [selected]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const { data } = await api.resourceAction({
        resourceId: "combos",
        actionName: "quickNew",
        data: { ...form, items: JSON.stringify(items) },
      });
      if (data.notice?.type === "error") {
        setNotice({ type: "danger", message: data.notice.message });
        return;
      }
      if (data.redirectUrl) window.location.assign(data.redirectUrl);
    } catch (error) {
      setNotice({ type: "danger", message: error.response?.data?.message || "Không thể tạo combo." });
    } finally {
      setSaving(false);
    }
  };

  return <Box variant="white" p="xl" maxWidth={900}>
    <H2>Tạo combo nhanh</H2>
    <p>Điền thông tin cơ bản và chọn các sản phẩm bên dưới. Giá mua lẻ, giá combo và tồn kho sẽ được hệ thống tự tính.</p>
    {notice && <MessageBox variant={notice.type} mb="lg">{notice.message}</MessageBox>}
    <form onSubmit={submit}>
      <Box mb="lg"><Label>Tên combo *</Label><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ví dụ: Combo rau củ cho quán ăn 30 suất" /></Box>
      <Box mb="lg"><Label>Mô tả ngắn</Label><textarea style={inputStyle} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Combo phù hợp với loại quán hoặc nhu cầu nào?" /></Box>
      <Box display="grid" gridTemplateColumns={["1fr", "1fr 1fr"]} gridGap="lg" mb="xl">
        <div><Label>Quy mô combo</Label><select style={inputStyle} value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}><option value="small">Nhỏ - quán nhỏ</option><option value="medium">Vừa - nhà hàng vừa</option><option value="large">Lớn - bếp ăn số lượng lớn</option></select></div>
        <div><Label>Giảm bao nhiêu % *</Label><input style={inputStyle} type="number" min="1" max="99" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} /></div>
      </Box>
      <H2>Chọn sản phẩm trong combo</H2>
      <p>Đánh dấu sản phẩm cần dùng rồi nhập số lượng cho một combo theo đúng đơn vị đang bán.</p>
      {loading ? <p>Đang tải sản phẩm…</p> : products.map((product) => {
        const checked = Object.prototype.hasOwnProperty.call(selected, product.id);
        return <Box key={product.id} display="grid" gridTemplateColumns="32px 1fr 180px" alignItems="center" gridGap="lg" py="md" borderBottom="default">
          <input type="checkbox" checked={checked} onChange={(e) => setSelected((current) => { const next = { ...current }; if (e.target.checked) next[product.id] = 1; else delete next[product.id]; return next; })} />
          <div><b>{product.name}</b><div>Còn {Number(product.quantity).toLocaleString("vi-VN")} {product.unit || "sản phẩm"} · {Number(product.price).toLocaleString("vi-VN")} ₫</div></div>
          <input style={inputStyle} type="number" min="0.01" step="0.01" disabled={!checked} value={checked ? selected[product.id] : ""} onChange={(e) => setSelected({ ...selected, [product.id]: e.target.value })} placeholder={`Số ${product.unit || "lượng"}`} />
        </Box>;
      })}
      <Box mt="xl"><Button type="submit" variant="primary" disabled={saving || loading}>{saving ? "Đang tạo…" : `Tạo combo với ${items.length} sản phẩm`}</Button></Box>
    </form>
  </Box>;
};

export default QuickCombo;
