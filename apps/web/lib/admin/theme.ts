import type { ThemeConfig } from "antd";

/** KiotViet-style tokens shared with the storefront (docs/design-guidelines.md s.1.1). */
export const adminTheme: ThemeConfig = {
  token: {
    colorPrimary: "#D7141C",
    colorLink: "#D7141C",
    colorSuccess: "#16A34A",
    colorError: "#DC2626",
    colorWarning: "#B45309",
    colorText: "#1F2937",
    colorTextSecondary: "#6B7280",
    colorBorder: "#D1D5DB",
    colorBgLayout: "#F3F4F6",
    borderRadius: 4,
    fontSize: 13,
    controlHeight: 34,
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  components: {
    Table: { headerBg: "#E1E9F5", rowHoverBg: "#FDEBEC", cellPaddingBlock: 9 },
    Modal: { borderRadiusLG: 8 },
  },
};

export const NAV_BLUE = "#1C1917";
