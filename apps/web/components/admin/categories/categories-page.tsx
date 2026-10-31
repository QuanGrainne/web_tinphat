"use client";

import { useState } from "react";
import { Alert, Button, Table } from "antd";
import type { TableColumnsType } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useCategories } from "@/lib/admin/catalogue-queries";
import { formatNumber } from "@/lib/format/money";
import type { AdminCategory } from "@/lib/api/types";
import { VisibleBadge } from "../products/status-badge";
import styles from "../products/products.module.css";
import { CategoryDialog } from "./category-dialog";

const columns: TableColumnsType<AdminCategory> = [
  { title: "Tên nhóm", dataIndex: "name", render: (name: string, row) => (row.parentId === null ? <b>{name}</b> : name) },
  { title: "Đường dẫn (slug)", dataIndex: "slug", width: 280, render: (v: string) => <span className={styles.mono}>{v}</span> },
  { title: "Số hàng", dataIndex: "productCount", align: "right", width: 100, render: (v: number) => formatNumber(v) },
  { title: "Thứ tự", dataIndex: "sortOrder", align: "right", width: 90 },
  { title: "Hiển thị web", dataIndex: "visible", width: 120, render: (v: boolean) => <VisibleBadge visible={v} /> },
];

/** `/admin/categories`: two-level tree with product counts, create and edit dialogs. */
export function CategoriesPage() {
  const categories = useCategories();
  // undefined = closed, null = create, otherwise edit that group.
  const [dialog, setDialog] = useState<AdminCategory | null | undefined>(undefined);

  return (
    <>
      <div className={styles.ptitle}>
        <h1>Nhóm hàng</h1>
        <div className={styles.tools}>
          <Button icon={<PlusOutlined />} color="primary" variant="outlined" onClick={() => setDialog(null)}>
            Tạo mới
          </Button>
        </div>
      </div>
      {categories.isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          title={categories.error instanceof Error ? categories.error.message : "Không tải được nhóm hàng."}
          action={
            <Button size="small" onClick={() => void categories.refetch()}>
              Thử lại
            </Button>
          }
        />
      )}
      <div className={styles.tblwrap}>
        <Table<AdminCategory>
          rowKey="id"
          columns={columns}
          dataSource={categories.data ?? []}
          loading={categories.isFetching}
          pagination={false}
          expandable={{ defaultExpandAllRows: true, childrenColumnName: "children", indentSize: 24 }}
          rowClassName={() => styles.clickRow}
          onRow={(row) => ({ onClick: () => setDialog(row) })}
          locale={{ emptyText: "Chưa có nhóm hàng" }}
        />
      </div>
      {dialog !== undefined && <CategoryDialog open category={dialog} onClose={() => setDialog(undefined)} />}
    </>
  );
}
