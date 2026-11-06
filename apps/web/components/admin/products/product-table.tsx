"use client";

import { useState, type ReactNode } from "react";
import { Popover, Table } from "antd";
import type { TableColumnsType } from "antd";
import { ImageLightbox } from "@/components/image-lightbox";
import { formatNumber } from "@/lib/format/money";
import type { AdminProductList, AdminProductRow } from "@/lib/api/types";
import { StatusBadge, VisibleBadge } from "./status-badge";
import styles from "./products.module.css";

export const PRODUCT_PAGE_SIZE = 30;

const columns: TableColumnsType<AdminProductRow> = [
  {
    title: "Mã sản phẩm",
    dataIndex: "baseCode",
    width: 230,
    ellipsis: true,
    render: (code: string | null) => <span className={styles.mono}>{code ?? "-"}</span>,
  },
  {
    title: "Tên sản phẩm",
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
  {
    title: "Giá",
    dataIndex: "basePrice",
    align: "right",
    width: 130,
    render: (v: number | null) => <span className={styles.num}>{v === null ? "Liên hệ" : formatNumber(v)}</span>,
  },
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
  selected,
  onSelect,
  actions,
}: {
  data: AdminProductList | undefined;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onOpen: (id: number) => void;
  selected: number[];
  onSelect: (ids: number[]) => void;
  /** Shown beside the totals while products are ticked. */
  actions?: ReactNode;
}) {
  const [viewing, setViewing] = useState<string[] | null>(null);
  const imageColumn: TableColumnsType<AdminProductRow>[number] = {
    title: "Ảnh",
    key: "image",
    width: 64,
    render: (_, row) =>
      row.images.length > 0 ? (
        <Popover
          placement="right"
          mouseEnterDelay={0.15}
          styles={{ container: { padding: 6 } }}
          content={
            // eslint-disable-next-line @next/next/no-img-element -- hover preview of an uploaded or linked photo
            <img src={row.images[0]} alt="" width={220} height={220} style={{ display: "block", objectFit: "contain", borderRadius: 4 }} />
          }
        >
          <button
            type="button"
            aria-label={`Xem ảnh ${row.name}`}
            onClick={(event) => {
              event.stopPropagation();
              setViewing(row.images);
            }}
            style={{ display: "block", width: 40, height: 40, padding: 0, overflow: "hidden", border: "1px solid #E7E2DA", borderRadius: 4, background: "#F2EFE9", cursor: "zoom-in" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- small list thumbnail */}
            <img src={row.images[0]} alt="" width={40} height={40} loading="lazy" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
          </button>
        </Popover>
      ) : (
        <span style={{ display: "block", width: 40, height: 40, borderRadius: 4, background: "#F2EFE9" }} />
      ),
  };

  return (
    <div className={styles.tblwrap}>
      <div className={styles.totals}>
        <span>{formatNumber(data?.totals.products ?? 0)} sản phẩm</span>
        {actions}
      </div>
      <Table<AdminProductRow>
        rowKey="id"
        rowSelection={{ selectedRowKeys: selected, preserveSelectedRowKeys: true, onChange: (keys) => onSelect(keys as number[]) }}
        columns={[imageColumn, ...columns]}
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
        locale={{ emptyText: "Chưa có sản phẩm nào" }}
      />
      {viewing && <ImageLightbox images={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
