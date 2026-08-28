import type { CSSProperties } from "react";

export const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
};

export const centeredMessageStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  gap: 20,
  padding: 20,
};

export const primaryButtonStyle: CSSProperties = {
  marginTop: 8,
  padding: "14px 28px",
  border: "none",
  borderRadius: 14,
  background: "var(--accent)",
  color: "white",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};
