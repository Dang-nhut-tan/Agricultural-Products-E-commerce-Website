import React from "react";
import { Box, Text, ValueGroup } from "@adminjs/design-system";

const ImagePreview = ({ property, record, where }) => {
  const imageUrl = record?.params?.[property.path];

  if (!imageUrl) {
    return where === "list" ? <Text color="grey60">Chưa có ảnh</Text> : null;
  }

  const image = (
    <Box
      as="img"
      src={imageUrl}
      alt="Ảnh"
      width={where === "list" ? "56px" : "280px"}
      height={where === "list" ? "56px" : "200px"}
      style={{ objectFit: "cover", borderRadius: "10px", border: "1px solid #e5e7eb" }}
    />
  );

  return where === "list"
    ? image
    : <ValueGroup label={property.label}>{image}</ValueGroup>;
};

export default ImagePreview;
