import React, { useEffect, useState } from "react";
import { ApiClient } from "adminjs";
import { Box, Icon, Loader, Text } from "@adminjs/design-system";

const api = new ApiClient();
const palette = { ink: "#17352b", muted: "#6b7f77", green: "#168554", pale: "#eaf7f0", line: "#e5ece8", canvas: "#f5f8f6" };
const metrics = [
  { key: "users", label: "Người dùng", icon: "Users", tone: "#4f46e5", soft: "#eef2ff", note: "Tài khoản trong hệ thống" },
  { key: "products", label: "Sản phẩm", icon: "Package", tone: "#168554", soft: "#eaf7f0", note: "Mặt hàng đang quản lý" },
  { key: "orders", label: "Đơn hàng", icon: "ClipboardList", tone: "#e66a24", soft: "#fff2e9", note: "Tổng đơn đã tiếp nhận" },
  { key: "feedback", label: "Đánh giá", icon: "MessageSquare", tone: "#c48a0a", soft: "#fff8df", note: "Phản hồi từ khách hàng" },
  { key: "categories", label: "Danh mục", icon: "Tags", tone: "#7c3aed", soft: "#f3edff", note: "Nhóm sản phẩm hiện có" },
];
const formatNumber = (value) => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const formatDate = (date) => date ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date)) : "—";

const MetricCard = ({ item, value }) => (
  <Box bg="white" p="24px" borderRadius="16px" style={{ border: `1px solid ${palette.line}`, boxShadow: "0 8px 24px rgba(24,62,47,.06)" }}>
    <Box display="flex" alignItems="flex-start" justifyContent="space-between">
      <Box><Text color={palette.muted} fontSize="13px" fontWeight="600">{item.label}</Text>
        <Text mt="8px" color={palette.ink} fontSize="32px" lineHeight="38px" fontWeight="700">{formatNumber(value)}</Text></Box>
      <Box width="46px" height="46px" display="flex" alignItems="center" justifyContent="center" borderRadius="13px" bg={item.soft} color={item.tone}>
        <Icon icon={item.icon} size={23} />
      </Box>
    </Box>
    <Text mt="16px" pt="14px" color={palette.muted} fontSize="12px" style={{ borderTop: `1px solid ${palette.line}` }}>{item.note}</Text>
  </Box>
);

const ExpiryTable = ({ title, subtitle, batches, tone, soft, emptyText, icon }) => (
  <Box bg="white" borderRadius="16px" overflow="hidden" style={{ border: `1px solid ${palette.line}`, boxShadow: "0 8px 24px rgba(24,62,47,.05)" }}>
    <Box p="22px 24px" display="flex" alignItems="center" justifyContent="space-between" style={{ borderBottom: `1px solid ${palette.line}`, gap: 12 }}>
      <Box display="flex" alignItems="center" style={{ gap: 12 }}>
        <Box width="40px" height="40px" display="flex" alignItems="center" justifyContent="center" borderRadius="12px" bg={soft} color={tone}><Icon icon={icon} size={20} /></Box>
        <Box><Text color={palette.ink} fontSize="16px" fontWeight="700">{title}</Text><Text mt="3px" color={palette.muted} fontSize="12px">{subtitle}</Text></Box>
      </Box>
      <Box bg={soft} px="12px" py="6px" borderRadius="20px"><Text color={tone} fontSize="12px" fontWeight="700">{batches.length} lô</Text></Box>
    </Box>
    {!batches.length ? (
      <Box p="44px 24px" textAlign="center">
        <Box mx="auto" mb="12px" width="46px" height="46px" display="flex" alignItems="center" justifyContent="center" borderRadius="50%" bg={palette.pale} color={palette.green}><Icon icon="CheckCircle" size={22} /></Box>
        <Text color={palette.ink} fontWeight="600">Mọi thứ đều ổn</Text><Text mt="5px" color={palette.muted} fontSize="13px">{emptyText}</Text>
      </Box>
    ) : (
      <Box overflowX="auto"><Box as="table" width="100%" style={{ borderCollapse: "collapse", minWidth: 560 }}>
        <Box as="thead" bg="#fafcfb"><Box as="tr">{["Sản phẩm", "Mã lô", "Tồn", "Hạn sử dụng"].map((label) => (
          <Box as="th" key={label} p="13px 20px" textAlign="left" color={palette.muted} fontSize="11px" fontWeight="700" style={{ textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</Box>
        ))}</Box></Box>
        <Box as="tbody">{batches.map((batch) => (
          <Box as="tr" key={batch.id} style={{ borderTop: `1px solid ${palette.line}` }}>
            <Box as="td" p="16px 20px"><Text color={palette.ink} fontSize="13px" fontWeight="600">{batch.productName}</Text></Box>
            <Box as="td" p="16px 20px"><Text color={palette.muted} fontSize="13px">{batch.batchCode || `#${batch.id}`}</Text></Box>
            <Box as="td" p="16px 20px"><Text color={palette.ink} fontSize="13px">{formatNumber(batch.remainingQuantity)}</Text></Box>
            <Box as="td" p="16px 20px"><Box display="inline-block" bg={soft} px="10px" py="5px" borderRadius="20px"><Text color={tone} fontSize="12px" fontWeight="700">{formatDate(batch.expiryDate)}</Text></Box></Box>
          </Box>
        ))}</Box>
      </Box></Box>
    )}
  </Box>
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  useEffect(() => { api.getDashboard().then((response) => setData(response.data)); }, []);
  if (!data) return <Box minHeight="70vh" display="flex" alignItems="center" justifyContent="center" bg={palette.canvas}><Loader /></Box>;
  const today = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date());
  return (
    <Box minHeight="100vh" bg={palette.canvas} p={["20px", "32px"]}><Box maxWidth="1440px" mx="auto">
      <Box mb="28px" p={["24px", "30px 34px"]} borderRadius="20px" color="white" style={{ background: "linear-gradient(120deg,#0d5f3b 0%,#168554 58%,#52a86c 100%)", boxShadow: "0 14px 34px rgba(13,95,59,.20)", position: "relative", overflow: "hidden" }}>
        <Box style={{ position: "absolute", width: 240, height: 240, right: -55, top: -105, borderRadius: "50%", background: "rgba(255,255,255,.09)" }} />
        <Box style={{ position: "absolute", width: 130, height: 130, right: 145, bottom: -95, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" style={{ gap: 18, position: "relative" }}>
          <Box><Text color="rgba(255,255,255,.75)" fontSize="12px" fontWeight="600" style={{ textTransform: "uppercase", letterSpacing: ".08em" }}>Nông Sản Xanh · Quản trị</Text>
            <Text mt="8px" color="white" fontSize={["24px", "30px"]} lineHeight="38px" fontWeight="700">Chào mừng trở lại 👋</Text>
            <Text mt="7px" color="rgba(255,255,255,.80)" fontSize="14px">Tổng quan hoạt động cửa hàng của bạn hôm nay.</Text></Box>
          <Box px="15px" py="10px" borderRadius="12px" style={{ background: "rgba(255,255,255,.13)", border: "1px solid rgba(255,255,255,.17)", backdropFilter: "blur(8px)" }}>
            <Text color="white" fontSize="13px" fontWeight="600" style={{ textTransform: "capitalize" }}>{today}</Text>
          </Box>
        </Box>
      </Box>
      {!data.databaseConnected && <Box mb="24px" p="16px 18px" bg="#fff0f0" borderRadius="12px" style={{ border: "1px solid #ffd1d1" }}><Box display="flex" alignItems="center" style={{ gap: 10 }}><Icon icon="AlertTriangle" color="#c93636" size={20} /><Text color="#9f2424" fontSize="13px" fontWeight="600">Không thể kết nối cơ sở dữ liệu. Số liệu tạm thời hiển thị bằng 0.</Text></Box></Box>}
      <Box mb="30px" display="grid" gridTemplateColumns="repeat(auto-fit,minmax(205px,1fr))" style={{ gap: 18 }}>{metrics.map((item) => <MetricCard key={item.key} item={item} value={data[item.key]} />)}</Box>
      <Box mb="16px"><Text color={palette.ink} fontSize="20px" fontWeight="700">Theo dõi hạn sử dụng</Text><Text mt="5px" color={palette.muted} fontSize="13px">Ưu tiên xử lý các lô hàng cần chú ý.</Text></Box>
      <Box display="grid" gridTemplateColumns="repeat(auto-fit,minmax(min(100%,480px),1fr))" style={{ gap: 20 }}>
        <ExpiryTable title="Lô đã hết hạn" subtitle="Cần ngừng bán và xử lý" batches={data.expired || []} tone="#c93636" soft="#fff0f0" icon="AlertOctagon" emptyText="Không có lô hàng nào đã hết hạn." />
        <ExpiryTable title="Sắp hết hạn trong 7 ngày" subtitle="Nên ưu tiên xuất kho sớm" batches={data.expiringSoon || []} tone="#d76419" soft="#fff2e9" icon="Clock" emptyText="Không có lô hàng nào sắp hết hạn." />
      </Box>
    </Box></Box>
  );
};
export default Dashboard;
