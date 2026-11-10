"use client";

import { useMemo, useState } from "react";
import { Checkbox, Select, TreeSelect } from "antd";
import { useCategories } from "@/lib/admin/catalogue-queries";
import type { AdminCategory } from "@/lib/api/types";
import { CategoryDialog } from "../categories/category-dialog";
import styles from "./products.module.css";

export type PublishedFilter = "all" | "yes" | "no";

export interface ProductFilters {
  categoryId: number | undefined;
  brandId: number | undefined;
  published: PublishedFilter;
  needsAttention: boolean;
}

interface Node {
  value: number;
  title: string;
  children: Node[];
}

/** Value of the "Tất cả" entry: no category filter. */
const ALL = 0;

function toNodes(list: AdminCategory[]): Node[] {
  return list.map((c) => ({ value: c.id, title: `${c.name} (${c.productCount})`, children: toNodes(c.children) }));
}

const PUBLISHED_PILLS: { value: PublishedFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "yes", label: "Có" },
  { value: "no", label: "Không" },
];

/** Left filter column of the product list: Danh mục, Hiển thị trên web, Cần bổ sung. */
export function ProductFilterColumn({
  filters,
  onChange,
}: {
  filters: ProductFilters;
  onChange: (next: ProductFilters) => void;
}) {
  const categories = useCategories();
  const [categoryDialog, setCategoryDialog] = useState(false);
  const nodes = useMemo(() => [{ value: ALL, title: "Tất cả", children: [] }, ...toNodes(categories.data ?? [])], [categories.data]);

  return (
    <aside className={styles.fcol} aria-label="Bộ lọc">
      <div className={styles.fb}>
        <h3 className={styles.fbTitle}>
          Danh mục
          <button type="button" className={styles.fbLink} onClick={() => setCategoryDialog(true)}>
            Tạo mới
          </button>
        </h3>
        <TreeSelect
          style={{ width: "100%" }}
          aria-label="Danh mục"
          treeData={nodes}
          treeDefaultExpandAll
          showSearch
          treeNodeFilterProp="title"
          loading={categories.isPending}
          value={filters.categoryId ?? ALL}
          onChange={(value) => onChange({ ...filters, categoryId: value ? value : undefined })}
        />
      </div>
      <div className={styles.fb}>
        <h3 className={styles.fbTitle}>Hiển thị trên web</h3>
        <div className={styles.pills}>
          {PUBLISHED_PILLS.map((pill) => (
            <button
              key={pill.value}
              type="button"
              className={`${styles.pill} ${filters.published === pill.value ? styles.pillOn : ""}`}
              aria-pressed={filters.published === pill.value}
              onClick={() => onChange({ ...filters, published: pill.value })}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.fb}>
        <h3 className={styles.fbTitle}>Cần bổ sung</h3>
        <Checkbox checked={filters.needsAttention} onChange={(e) => onChange({ ...filters, needsAttention: e.target.checked })}>
          Chỉ sản phẩm cần bổ sung
        </Checkbox>
        <p className={styles.hint}>Thiếu ảnh hoặc chưa có danh mục.</p>
      </div>

      {categoryDialog && <CategoryDialog open onClose={() => setCategoryDialog(false)} />}
    </aside>
  );
}
