"use client";

import { useState } from "react";
import { Alert, Button, Table } from "antd";
import type { TableColumnsType } from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useCategories } from "@/lib/admin/catalogue-queries";
import { formatNumber } from "@/lib/format/money";
import type { AdminCategory } from "@/lib/api/types";
import { VisibleBadge } from "../products/status-badge";
import styles from "../products/products.module.css";
import { CategoryDialog } from "./category-dialog";

/** Table row: no `children` key on a leaf, otherwise the table draws an expand icon that does nothing. */
type CategoryRow = Omit<AdminCategory, "children"> & { children?: CategoryRow[] };

function toRows(list: AdminCategory[]): CategoryRow[] {
  return list.map(({ children, ...category }) => (children.length > 0 ? { ...category, children: toRows(children) } : category));
}

const columns: TableColumnsType<CategoryRow> = [
  {
    title: "Ảnh",
    dataIndex: "imageUrl",
    width: 80,
    render: (url: string | null) =>
      url ? (
        // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
        <img src={url} alt="" width={48} height={48} style={{ objectFit: "cover", borderRadius: 4, display: "block" }} />
      ) : (
        "-"
      ),
  },
  { title: "Tên danh mục", dataIndex: "name", render: (name: string, row) => (row.parentId === null ? <b>{name}</b> : name) },
  { title: "Đường dẫn (slug)", dataIndex: "slug", width: 280, render: (v: string) => <span className={styles.mono}>{v}</span> },
  { title: "Số sản phẩm", dataIndex: "productCount", align: "right", width: 100, render: (v: number) => formatNumber(v) },
  { title: "Thứ tự", dataIndex: "sortOrder", align: "right", width: 90 },
  { title: "Hiển thị web", dataIndex: "visible", width: 120, render: (v: boolean) => <VisibleBadge visible={v} /> },
];

/** `/admin/categories`: two-level tree with product counts, create and edit dialogs. */
export function CategoriesPage() {
  const categories = useCategories();
  // undefined = closed, null = create, otherwise edit that group.
  const [dialog, setDialog] = useState<CategoryRow | null | undefined>(undefined);
  const editColumn: TableColumnsType<CategoryRow>[number] = {
    title: "",
    key: "edit",
    width: 96,
    align: "right",
    render: (_, row) => (
      <Button
        size="small"
        icon={<EditOutlined />}
        aria-label={`Sửa ${row.name}`}
        onClick={(event) => {
          event.stopPropagation();
          setDialog(row);
        }}
      >
        Sửa
      </Button>
    ),
  };

  return (
    <>
      <div className={styles.ptitle}>
        <h1>Danh mục</h1>
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
          title={categories.error instanceof Error ? categories.error.message : "Không tải được danh mục."}
          action={
            <Button size="small" onClick={() => void categories.refetch()}>
              Thử lại
            </Button>
          }
        />
      )}
      <div className={styles.tblwrap}>
        <Table<CategoryRow>
          rowKey="id"
          columns={[...columns, editColumn]}
          dataSource={toRows(categories.data ?? [])}
          loading={categories.isFetching}
          pagination={false}
          expandable={{ defaultExpandAllRows: true, childrenColumnName: "children", indentSize: 24 }}
          rowClassName={() => styles.clickRow}
          onRow={(row) => ({ onClick: () => setDialog(row) })}
          locale={{ emptyText: "Chưa có danh mục" }}
        />
      </div>
      {dialog !== undefined && <CategoryDialog open category={dialog} onClose={() => setDialog(undefined)} />}
    </>
  );
}
