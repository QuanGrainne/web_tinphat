"use client";

import { useState } from "react";
import { Alert, Button, Table } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useBrands } from "@/lib/admin/catalogue-queries";
import { formatNumber } from "@/lib/format/money";
import type { AdminBrand } from "@/lib/api/types";
import { VisibleBadge } from "../products/status-badge";
import styles from "../products/products.module.css";
import { BrandDialog } from "./brand-dialog";

const columns: TableColumnsType<AdminBrand> = [
  { title: "Tên thương hiệu", dataIndex: "name" },
  { title: "Đường dẫn (slug)", dataIndex: "slug", width: 280, render: (v: string) => <span className={styles.mono}>{v}</span> },
  { title: "Số hàng", dataIndex: "productCount", align: "right", width: 100, render: (v: number) => formatNumber(v) },
  { title: "Hiển thị web", dataIndex: "visible", width: 120, render: (v: boolean) => <VisibleBadge visible={v} /> },
];

/** `/admin/brands`: brand table with create and edit dialogs. */
export function BrandsPage() {
  const brands = useBrands();
  // undefined = closed, null = create, otherwise edit that brand.
  const [dialog, setDialog] = useState<AdminBrand | null | undefined>(undefined);

  return (
    <>
      <div className={styles.ptitle}>
        <h1>Thương hiệu</h1>
        <div className={styles.tools}>
          <Button icon={<PlusOutlined />} color="primary" variant="outlined" onClick={() => setDialog(null)}>
            Tạo mới
          </Button>
        </div>
      </div>
      {brands.isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          title={brands.error instanceof Error ? brands.error.message : "Không tải được thương hiệu."}
          action={
            <Button size="small" onClick={() => void brands.refetch()}>
              Thử lại
            </Button>
          }
        />
      )}
      <div className={styles.tblwrap}>
        <Table<AdminBrand>
          rowKey="id"
          columns={columns}
          dataSource={brands.data ?? []}
          loading={brands.isFetching}
          pagination={false}
          rowClassName={() => styles.clickRow}
          onRow={(row) => ({ onClick: () => setDialog(row) })}
          locale={{ emptyText: "Chưa có thương hiệu" }}
        />
      </div>
      {dialog !== undefined && <BrandDialog open brand={dialog} onClose={() => setDialog(undefined)} />}
    </>
  );
}
