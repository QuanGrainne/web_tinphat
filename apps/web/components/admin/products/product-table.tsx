"use client";

import { Table } from "antd";
import type { TableColumnsType } from "antd";
import { formatNumber } from "@/lib/format/money";
import type { AdminProductList, AdminProductRow } from "@/lib/api/types";
import { StatusBadge, VisibleBadge } from "./status-badge";
import styles from "./products.module.css";

export const PRODUCT_PAGE_SIZE = 30;

const columns: TableColumnsType<AdminProductRow> = [
  {
    title: "Mã hàng (đơn vị cơ bản)",
    dataIndex: "baseCode",
    width: 230,
    ellipsis: true,
    render: (code: string | null) => <span className={styles.mono}>{code ?? "-"}</span>,
  },
  {
    title: "Tên hàng",
    dataIndex: "name",
    render: (name: string, row) => (
      <span>
        {name}
        {row.needsConfirmation && (
          <>
            {" "}
            <StatusBadge tone="warn">Cần xác nhận quy cách</StatusBadge>
          </>
        )}
      </span>
    ),
  },
  { title: "Thương hiệu", dataIndex: "brandName", width: 130, render: (v: string | null) => v ?? "-" },
  {
    title: "Giá đơn vị cơ bản",
    dataIndex: "basePrice",
    align: "right",
    width: 140,
    render: (v: number | null) => <span className={styles.num}>{v === null ? "-" : formatNumber(v)}</span>,
  },
  { title: "Quy cách", dataIndex: "skuCount", align: "right", width: 90 },
  {
    title: "Hiển thị web",
    dataIndex: "published",
    width: 110,
    render: (published: boolean) => <VisibleBadge visible={published} />,
  },
  {
    title: "Trạng thái",
    dataIndex: "status",
    width: 170,
    render: (status: AdminProductRow["status"], row) => (
      <span>
        {status === "ACTIVE" ? "Đang kinh doanh" : "Ngừng kinh doanh"}
        {row.needsAttention && (
          <>
            {" "}
            <StatusBadge tone="warn">Cần bổ sung</StatusBadge>
          </>
        )}
      </span>
    ),
  },
];

/** Product list table with the bold totals line above it; a row click opens the editor. */
export function ProductTable({
  data,
  loading,
  page,
  onPageChange,
  onOpen,
}: {
  data: AdminProductList | undefined;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onOpen: (id: number) => void;
}) {
  return (
    <div className={styles.tblwrap}>
      <div className={styles.totals}>
        <span>{formatNumber(data?.totals.products ?? 0)} dòng sản phẩm</span>
        <span>{formatNumber(data?.totals.skus ?? 0)} quy cách</span>
        <span>{formatNumber(data?.totals.visibleSkus ?? 0)} quy cách hiện</span>
      </div>
      <Table<AdminProductRow>
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={{
          current: page,
          pageSize: PRODUCT_PAGE_SIZE,
          total: data?.total ?? 0,
          showSizeChanger: false,
          onChange: onPageChange,
          style: { padding: "0 12px" },
        }}
        rowClassName={() => styles.clickRow}
        onRow={(row) => ({ onClick: () => onOpen(row.id) })}
        locale={{ emptyText: "Không có hàng hóa nào" }}
      />
    </div>
  );
}
