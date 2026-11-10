"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Input, Tooltip } from "antd";
import { DeleteOutlined, DownloadOutlined, PlusOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiProblem } from "@/lib/admin/api-client";
import { catalogueApi, type ProductListQuery } from "@/lib/admin/catalogue-api";
import { catalogueKeys } from "@/lib/admin/catalogue-queries";
import { useSession } from "@/lib/admin/use-session";
import { ImportDialog } from "./import-dialog";
import { ProductEditorModal } from "./product-editor-modal";
import { ProductFilterColumn, type ProductFilters } from "./product-filter-column";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, ProductTable } from "./product-table";
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

const PAGE_SIZE_KEY = "dna.admin.products.pageSize";

/** The row count chosen last time, if it is still one of the offered values. */
function readPageSize(): number {
  try {
    const saved = Number(window.localStorage.getItem(PAGE_SIZE_KEY));
    return (PAGE_SIZES as readonly number[]).includes(saved) ? saved : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

/** `/admin/products`: filter column, search, table and the editor modal. */
export function ProductsPage() {
  const queryClient = useQueryClient();
  const { isManager } = useSession();
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);
  const { message, modal } = App.useApp();
  const [filters, setFilters] = useState<ProductFilters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(readPageSize);
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
    size: pageSize,
  };
  const list = useQuery({
    queryKey: ["admin", "products", params],
    queryFn: () => catalogueApi.listProducts(params),
    placeholderData: keepPreviousData,
  });

  function changeFilters(next: ProductFilters) {
    setFilters(next);
    setPage(1);
    setSelected([]);
  }

  async function exportSelected() {
    setExporting(true);
    try {
      await catalogueApi.exportProducts(selected);
    } catch (error) {
      message.error(error instanceof ApiProblem ? error.message : "Không xuất được file.");
    } finally {
      setExporting(false);
    }
  }

  function deleteSelected() {
    modal.confirm({
      title: `Xóa ${selected.length} sản phẩm đã chọn?`,
      content: "Sản phẩm sẽ bị xóa hẳn khỏi admin và website, không khôi phục được. Nếu chỉ muốn tạm ẩn, hãy bỏ chọn Hiển thị trên web.",
      okText: `Xóa ${selected.length} sản phẩm`,
      cancelText: "Bỏ qua",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const result = await catalogueApi.deleteProducts(selected);
          if (result.deleted > 0) message.success(`Đã xóa ${result.deleted} sản phẩm`);
          if (result.blocked.length > 0) message.warning(`${result.blocked.length} sản phẩm không xóa được: ${result.blocked[0].message}`, 8);
          setSelected(result.blocked.map((item) => item.id));
          refreshAfterChange();
        } catch (error) {
          message.error(error instanceof ApiProblem ? error.message : "Không xóa được sản phẩm.");
        }
      },
    });
  }

  function refreshAfterChange() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    void queryClient.invalidateQueries({ queryKey: catalogueKeys.categories });
    void queryClient.invalidateQueries({ queryKey: catalogueKeys.brands });
  }

  return (
    <>
      <div className={styles.ptitle}>
        <h1>Sản phẩm</h1>
        <Input
          className={styles.search}
          allowClear
          prefix={<SearchOutlined style={{ color: "#6B7280" }} />}
          placeholder="Theo mã, tên hàng"
          aria-label="Tìm sản phẩm"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
            setSelected([]);
          }}
        />
        <div className={styles.tools}>
          <Button
            icon={<DownloadOutlined />}
            href={`/api/admin/exports/products${filters.categoryId ? `?categoryId=${filters.categoryId}` : ""}`}
          >
            Xuất Excel
          </Button>
          <Tooltip title={isManager ? undefined : "Chỉ quản lý được import sản phẩm"}>
            <Button icon={<UploadOutlined />} disabled={!isManager} onClick={() => setImporting(true)}>
              Import Excel
            </Button>
          </Tooltip>
          <Tooltip title={isManager ? undefined : "Chỉ quản lý được tạo sản phẩm mới"}>
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
            pageSize={pageSize}
            onPageChange={(nextPage, nextSize) => {
              if (nextSize !== pageSize) {
                // a new row count starts from the first page, like a new filter
                setPageSize(nextSize);
                setPage(1);
                try {
                  window.localStorage.setItem(PAGE_SIZE_KEY, String(nextSize));
                } catch {
                  // private window or blocked storage: the choice just is not remembered
                }
              } else {
                setPage(nextPage);
              }
              setSelected([]);
            }}
            onOpen={(id) => setEditing(id)}
            selected={selected}
            onSelect={setSelected}
            actions={
              selected.length > 0 && (
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center", marginLeft: 16 }}>
                  Đã chọn {selected.length}
                  <Button size="small" icon={<DownloadOutlined />} loading={exporting} onClick={() => void exportSelected()}>
                    Xuất đã chọn
                  </Button>
                  <Tooltip title={isManager ? undefined : "Chỉ quản lý được xóa sản phẩm"}>
                    <Button size="small" danger icon={<DeleteOutlined />} disabled={!isManager} onClick={deleteSelected}>
                      Xóa
                    </Button>
                  </Tooltip>
                  <Button size="small" type="text" onClick={() => setSelected([])}>
                    Bỏ chọn
                  </Button>
                </span>
              )
            }
          />
        </section>
      </div>

      {editing !== undefined && (
        <ProductEditorModal productId={editing} onClose={() => setEditing(undefined)} onChanged={refreshAfterChange} />
      )}
      {importing && <ImportDialog onClose={() => setImporting(false)} onImported={refreshAfterChange} />}
    </>
  );
}
