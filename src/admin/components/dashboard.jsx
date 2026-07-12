import React, { useEffect, useState } from "react";
import { ApiClient } from "adminjs";
import { Box, H2, H4, Icon, Loader, Text } from "@adminjs/design-system";

const api = new ApiClient();

const cards = [
  { key: "users", label: "Người dùng", icon: "Users", color: "#4f46e5" },
  { key: "products", label: "Sản phẩm", icon: "Package", color: "#059669" },
  { key: "orders", label: "Đơn hàng", icon: "ClipboardList", color: "#ea580c" },
  { key: "feedback", label: "Đánh giá", icon: "MessageSquare", color: "#ca8a04" },
  { key: "categories", label: "Danh mục", icon: "Tags", color: "#7c3aed" },
];

const formatDate = (date) => new Intl.DateTimeFormat("vi-VN").format(new Date(date));

const ExpiryTable = ({ title, batches, color, emptyText }) => (
  <Box bg="white" borderRadius="lg" boxShadow="card" overflow="hidden">
    <Box p="lg" borderBottom="1px solid #e5e7eb">
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <H4>{title}</H4>
        <Box bg={color} color="white" px="md" py="sm" borderRadius="rounded">
          {batches.length} lô
        </Box>
      </Box>
    </Box>

    {!batches.length ? (
      <Text p="xl" color="grey60">{emptyText}</Text>
    ) : (
      <Box as="table" width="100%" style={{ borderCollapse: "collapse" }}>
        <Box as="thead" bg="grey20">
          <Box as="tr">
            {['Sản phẩm', 'Mã lô', 'Còn lại', 'Hạn sử dụng'].map((label) => (
              <Box as="th" key={label} p="md" textAlign="left">{label}</Box>
            ))}
          </Box>
        </Box>
        <Box as="tbody">
          {batches.map((batch) => (
            <Box as="tr" key={batch.id} borderBottom="1px solid #f3f4f6">
              <Box as="td" p="md">{batch.productName}</Box>
              <Box as="td" p="md">{batch.batchCode || `#${batch.id}`}</Box>
              <Box as="td" p="md">{batch.remainingQuantity}</Box>
              <Box as="td" p="md" color={color}>{formatDate(batch.expiryDate)}</Box>
            </Box>
          ))}
        </Box>
      </Box>
    )}
  </Box>
);

const Dashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getDashboard().then((response) => setData(response.data));
  }, []);

  if (!data) return <Box p="xxl"><Loader /></Box>;

  return (
    <Box p={["lg", "xxl"]}>
      <H2 mb="sm">Tổng quan cửa hàng</H2>
      <Text mb="xxl" color="grey60">Theo dõi nhanh các dữ liệu quan trọng trong hệ thống.</Text>

      {!data.databaseConnected && (
        <Box mb="xl" p="lg" bg="errorLight" borderRadius="default">
          <Text>Không thể kết nối database. Số liệu tạm thời hiển thị bằng 0.</Text>
        </Box>
      )}

      <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(210px, 1fr))" gridGap="xl">
        {cards.map((card) => (
          <Box key={card.key} bg="white" p="xl" borderRadius="lg" boxShadow="card">
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Text color="grey60" mb="sm">{card.label}</Text>
                <H4 fontSize="32px">{data[card.key] ?? 0}</H4>
              </Box>
              <Box bg={card.color} color="white" p="lg" borderRadius="rounded">
                <Icon icon={card.icon} size={28} />
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      <H2 mt="xxl" mb="lg">Cảnh báo hạn sử dụng</H2>
      <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(420px, 1fr))" gridGap="xl">
        <ExpiryTable
          title="Lô đã hết hạn"
          batches={data.expired || []}
          color="#dc2626"
          emptyText="Không có lô hàng nào đã hết hạn."
        />
        <ExpiryTable
          title="Lô sắp hết hạn trong 7 ngày"
          batches={data.expiringSoon || []}
          color="#ea580c"
          emptyText="Không có lô hàng nào sắp hết hạn."
        />
      </Box>
    </Box>
  );
};

export default Dashboard;
