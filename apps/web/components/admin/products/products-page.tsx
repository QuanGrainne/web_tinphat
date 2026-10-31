"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Input, Tooltip } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { catalogueApi, type ProductListQuery } from "@/lib/admin/catalogue-api";
import { catalogueKeys } from "@/lib/admin/catalogue-queries";
import { useSession } from "@/lib/admin/use-session";
import { ProductEditorModal } from "./product-editor-modal";
import { ProductFilterColumn, type ProductFilters } from "./product-filter-column";
import { PRODUCT_PAGE_SIZE, ProductTable } from "./product-table";
import styles from "./products.module.css";

const INITIAL_FILTERS: ProductFilters = { categoryId: undefined, brandId: undefined, published: "all", needsAttention: false };

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** `/admin/products`: filter column, search, table and the editor modal. */
export function ProductsPage() {
  const queryClient = useQueryClient();
  const { isManager } = useSession();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ProductFilters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  // undefined = closed, null = new product, number = existing product.
  const [editing, setEditing] = useState<number | null | undefined>(undefined);
  const q = useDebounced(search.trim(), 300);

  const params: ProductListQuery = {
    q: q || undefined,
    categoryId: filters.categoryId,
    brandId: filters.brandId,
    published: filters.published === "all" ? undefined : filters.published === "yes",
    needsAttention: filters.needsAttention ? true : undefined,
    page,
    size: PRODUCT_PAGE_SIZE,
  };
  const list = useQuery({
    queryKey: ["admin", "products", params],
    queryFn: () => catalogueApi.listProducts(params),
    placeholderData: keepPreviousData,
  });

  function changeFilters(next: ProductFilters) {
    setFilters(next);
    setPage(1);
  }

  function refreshAfterChange() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    void queryClient.invalidateQueries({ queryKey: catalogueKeys.categories });
    void queryClient.invalidateQueries({ queryKey: catalogueKeys.brands });
  }

  return (
    <>
      <div className={styles.ptitle}>
        <h1>Hàng hóa</h1>
        <Input
          className={styles.search}
          allowClear
          prefix={<SearchOutlined style={{ color: "#6B7280" }} />}
          placeholder="Theo mã, tên hàng"
          aria-label="Tìm hàng hóa"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className={styles.tools}>
          <Tooltip title={isManager ? undefined : "Chỉ quản lý được tạo hàng hóa mới"}>
            <Button icon={<PlusOutlined />} color="primary" variant="outlined" disabled={!isManager} onClick={() => setEditing(null)}>
              Tạo mới
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className={styles.layout}>
        <ProductFilterColumn filters={filters} onChange={changeFilters} />
        <section>
          {list.isError && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              title={list.error instanceof Error ? list.error.message : "Không tải được danh sách hàng hóa."}
              action={
                <Button size="small" onClick={() => void list.refetch()}>
                  Thử lại
                </Button>
              }
            />
          )}
          <ProductTable
            data={list.data}
            loading={list.isFetching}
            page={page}
            onPageChange={setPage}
            onOpen={(id) => setEditing(id)}
          />
        </section>
      </div>

      {editing !== undefined && (
        <ProductEditorModal productId={editing} onClose={() => setEditing(undefined)} onChanged={refreshAfterChange} />
      )}
    </>
  );
}
