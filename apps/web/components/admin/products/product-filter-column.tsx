"use client";

import { useMemo, useState } from "react";
import { Checkbox, Select, TreeSelect } from "antd";
import { useBrands, useCategories } from "@/lib/admin/catalogue-queries";
import type { AdminCategory } from "@/lib/api/types";
import { BrandDialog } from "../brands/brand-dialog";
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

function toNodes(list: AdminCategory[]): Node[] {
  return list.map((c) => ({ value: c.id, title: `${c.name} (${c.productCount})`, children: toNodes(c.children) }));
}

const PUBLISHED_PILLS: { value: PublishedFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "yes", label: "Có" },
  { value: "no", label: "Không" },
];

/** Left filter column of the product list: Nhóm hàng, Thương hiệu, Hiển thị trên web, Cần bổ sung. */
export function ProductFilterColumn({
  filters,
  onChange,
}: {
  filters: ProductFilters;
  onChange: (next: ProductFilters) => void;
}) {
  const categories = useCategories();
  const brands = useBrands();
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [brandDialog, setBrandDialog] = useState(false);
  const nodes = useMemo(() => toNodes(categories.data ?? []), [categories.data]);
  const brandOptions = useMemo(
    () => (brands.data ?? []).map((b) => ({ value: b.id, label: `${b.name} (${b.productCount})` })),
    [brands.data],
  );

  return (
    <aside className={styles.fcol} aria-label="Bộ lọc">
      <div className={styles.fb}>
        <h3 className={styles.fbTitle}>
          Nhóm hàng
          <button type="button" className={styles.fbLink} onClick={() => setCategoryDialog(true)}>
            Tạo mới
          </button>
        </h3>
        <TreeSelect
          style={{ width: "100%" }}
          aria-label="Nhóm hàng"
          treeData={nodes}
          treeDefaultExpandAll
          showSearch
          treeNodeFilterProp="title"
          allowClear
          placeholder="Chọn nhóm hàng"
          loading={categories.isPending}
          value={filters.categoryId}
          onChange={(value) => onChange({ ...filters, categoryId: value ?? undefined })}
        />
      </div>
      <div className={styles.fb}>
        <h3 className={styles.fbTitle}>
          Thương hiệu
          <button type="button" className={styles.fbLink} onClick={() => setBrandDialog(true)}>
            Tạo mới
          </button>
        </h3>
        <Select
          style={{ width: "100%" }}
          aria-label="Thương hiệu"
          options={brandOptions}
          showSearch
          optionFilterProp="label"
          allowClear
          placeholder="Chọn thương hiệu"
          loading={brands.isPending}
          value={filters.brandId}
          onChange={(value) => onChange({ ...filters, brandId: value ?? undefined })}
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
          Chỉ hàng cần bổ sung
        </Checkbox>
        <p className={styles.hint}>Thiếu ảnh, nhóm hàng hoặc quy cách có giá.</p>
      </div>

      {categoryDialog && <CategoryDialog open onClose={() => setCategoryDialog(false)} />}
      {brandDialog && <BrandDialog open onClose={() => setBrandDialog(false)} />}
    </aside>
  );
}
