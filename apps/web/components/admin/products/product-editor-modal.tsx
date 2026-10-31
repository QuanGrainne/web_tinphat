"use client";

import { useMemo, useState } from "react";
import { Alert, App, Button, Checkbox, Form, Input, Modal, Select, Spin, Table, Tabs, Tag, Tooltip, TreeSelect } from "antd";
import type { TableColumnsType } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ApiProblem, VERSION_CONFLICT_MESSAGE } from "@/lib/admin/api-client";
import { catalogueApi } from "@/lib/admin/catalogue-api";
import {
  buildProductPayload,
  newProduct,
  readMissing,
  toFormValues,
  type ProductFormValues,
  type SkuFormRow,
} from "@/lib/admin/catalogue-form";
import { useAdminSettings, useBrands, useCategories } from "@/lib/admin/catalogue-queries";
import { priceMismatchWarnings } from "@/lib/admin/pricing-display";
import { useSession } from "@/lib/admin/use-session";
import { formatNumber } from "@/lib/format/money";
import type { AdminCategory, AdminProduct } from "@/lib/api/types";
import { BrandDialog } from "../brands/brand-dialog";
import { CategoryDialog } from "../categories/category-dialog";
import { readProblem } from "./form-errors";
import { PriceWarningBox } from "./price-warning-box";
import { SectionCard } from "./section-card";
import { SkuPriceTable } from "./sku-price-table";
import styles from "./products.module.css";

const PLACEHOLDER_IMAGE = "/images/product-placeholder.svg";

/** Error banner state, kept by the modal so it survives the form remount that follows a partial save. */
export interface EditorProblem {
  kind: "conflict" | "error";
  title: string;
  items: string[];
}

interface CategoryNode {
  value: number;
  title: string;
  children: CategoryNode[];
}

function toCategoryNodes(list: AdminCategory[]): CategoryNode[] {
  return list.map((c) => ({ value: c.id, title: c.name, children: toCategoryNodes(c.children) }));
}

function describeFailure(error: unknown, form: Parameters<typeof readProblem>[1]): EditorProblem {
  if (error instanceof ApiProblem && error.code === "VERSION_CONFLICT") {
    return { kind: "conflict", title: VERSION_CONFLICT_MESSAGE, items: [] };
  }
  const readable = readProblem(error, form);
  const missing = error instanceof ApiProblem && error.code === "PUBLISH_REQUIREMENTS_UNMET" ? readMissing(error.problem) : [];
  return { kind: "error", title: readable.message, items: missing.length > 0 ? missing : readable.items };
}

/** Large KiotViet-style editor: Thông tin / Mô tả / SEO, "Quy cách & giá" card, publish toggle in the footer. */
export function ProductEditorModal({
  productId,
  onClose,
  onChanged,
}: {
  /** Null = create a new product. */
  productId: number | null;
  onClose: () => void;
  /** Called after anything was written, so the list can refresh. */
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const { isManager } = useSession();
  const settings = useAdminSettings();
  const [activeId, setActiveId] = useState<number | null>(productId);
  const [tab, setTab] = useState("info");
  const [problem, setProblem] = useState<EditorProblem | null>(null);
  const blank = useMemo(() => newProduct(), []);

  const query = useQuery({
    queryKey: ["admin", "product", activeId],
    queryFn: () => catalogueApi.getProduct(activeId as number),
    enabled: activeId !== null,
    staleTime: 5_000,
    gcTime: 0,
  });
  const product = activeId === null ? blank : query.data;

  function handleProductChange(saved: AdminProduct) {
    if (saved.id !== null) {
      queryClient.setQueryData(["admin", "product", saved.id], saved);
      setActiveId(saved.id);
    }
    onChanged();
  }

  async function reload() {
    setProblem(null);
    if (activeId !== null) await query.refetch();
  }

  return (
    <Modal
      open
      width={1100}
      style={{ top: 16 }}
      title={
        <span>
          {activeId === null ? "Tạo hàng hóa" : "Sửa hàng hóa"}
          {product?.status === "DISCONTINUED" && (
            <Tag color="default" style={{ marginLeft: 12 }}>
              Ngừng kinh doanh
            </Tag>
          )}
        </span>
      }
      footer={null}
      destroyOnHidden
      mask={{ closable: false }}
      styles={{ body: { padding: 0 } }}
      onCancel={onClose}
    >
      {product ? (
        <ProductEditorForm
          key={`${product.id ?? "new"}-${product.version ?? 0}`}
          product={product}
          isManager={isManager}
          threshold={settings.data?.pricingMismatchThresholdPct}
          tab={tab}
          onTabChange={setTab}
          problem={problem}
          onProblem={setProblem}
          onProductChange={handleProductChange}
          onReload={reload}
          onClose={onClose}
        />
      ) : query.isError ? (
        <div style={{ padding: 24 }}>
          <Alert
            type="error"
            showIcon
            title={query.error instanceof Error ? query.error.message : "Không tải được hàng hóa."}
            action={
              <Button size="small" onClick={() => void query.refetch()}>
                Thử lại
              </Button>
            }
          />
        </div>
      ) : (
        <div style={{ display: "grid", placeItems: "center", height: 240 }}>
          <Spin size="large" />
        </div>
      )}
    </Modal>
  );
}

interface FormProps {
  product: AdminProduct;
  isManager: boolean;
  threshold: number | undefined;
  tab: string;
  onTabChange: (tab: string) => void;
  problem: EditorProblem | null;
  onProblem: (problem: EditorProblem | null) => void;
  onProductChange: (product: AdminProduct) => void;
  onReload: () => Promise<void>;
  onClose: () => void;
}

function ProductEditorForm({
  product,
  isManager,
  threshold,
  tab,
  onTabChange,
  problem,
  onProblem,
  onProductChange,
  onReload,
  onClose,
}: FormProps) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<ProductFormValues>();
  const initial = useMemo(() => toFormValues(product), [product]);
  const watchedRows = Form.useWatch("skus", { form, preserve: true }) as SkuFormRow[] | undefined;
  const watchedImage = Form.useWatch("imageUrl", form) as string | null | undefined;
  const rows = watchedRows ?? initial.skus;
  const imageUrl = (watchedImage ?? initial.imageUrl ?? "").trim();

  const categories = useCategories();
  const brands = useBrands();
  const [published, setPublished] = useState(product.published);
  const [saving, setSaving] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [brandDialog, setBrandDialog] = useState(false);

  const isNew = product.id === null;
  const discontinued = product.status === "DISCONTINUED";

  const categoryNodes = useMemo(() => toCategoryNodes(categories.data ?? []), [categories.data]);
  const brandOptions = useMemo(() => (brands.data ?? []).map((b) => ({ value: b.id, label: b.name })), [brands.data]);

  const liveWarnings = useMemo(
    () =>
      threshold === undefined
        ? []
        : priceMismatchWarnings(
            rows.map((r) => ({ unitName: r.unitName ?? "", conversion: r.conversion, price: r.price, isBase: r.isBase })),
            threshold,
          ),
    [rows, threshold],
  );
  // Without the threshold (settings refused or failed) the server's own warnings are the best available.
  const serverMessages = threshold === undefined ? product.skus.flatMap((s) => s.warnings.map((w) => w.message)) : [];
  const productNotices = product.warnings.filter((w) => w.type !== "NO_IMAGE").map((w) => w.message);

  async function save() {
    onProblem(null);
    try {
      await form.validateFields();
    } catch {
      onTabChange("info");
      message.error("Vui lòng kiểm tra các ô đang báo lỗi.");
      return;
    }
    const values = form.getFieldsValue(true) as ProductFormValues;
    const payload = buildProductPayload(values, product, isManager);

    setSaving(true);
    let saved: AdminProduct;
    try {
      saved = product.id === null ? await catalogueApi.createProduct(payload) : await catalogueApi.updateProduct(product.id, payload);
    } catch (error) {
      onProblem(describeFailure(error, form));
      setSaving(false);
      return;
    }

    let latest = saved;
    let publishError: EditorProblem | null = null;
    if (isManager && saved.id !== null && published !== saved.published) {
      try {
        latest = published ? await catalogueApi.publishProduct(saved.id) : await catalogueApi.unpublishProduct(saved.id);
      } catch (error) {
        publishError = describeFailure(error, undefined);
      }
    }

    const mismatches = latest.skus.reduce((n, s) => n + s.warnings.filter((w) => w.type === "PRICE_MISMATCH").length, 0);
    if (publishError) {
      message.warning("Đã lưu thông tin, nhưng chưa đổi được trạng thái hiển thị.");
      onProblem(publishError);
      onProductChange(latest);
      setSaving(false);
      return;
    }
    onProductChange(latest);
    message.success("Đã lưu hàng hóa");
    if (mismatches > 0) message.warning(`Có ${mismatches} cảnh báo lệch giá. Kiểm tra lại quy cách.`);
    setSaving(false);
    onClose();
  }

  function changeStatus(kind: "discontinue" | "reactivate") {
    if (product.id === null) return;
    const id = product.id;
    if (form.isFieldsTouched()) {
      message.warning("Hãy Lưu hoặc Bỏ qua các thay đổi trước.");
      return;
    }
    const stop = kind === "discontinue";
    modal.confirm({
      title: stop ? "Ngừng kinh doanh hàng hóa này?" : "Kinh doanh lại hàng hóa này?",
      content: stop
        ? "Hàng hóa sẽ không còn đặt được trên website. Bạn có thể kinh doanh lại sau."
        : "Hàng hóa trở lại trạng thái đang kinh doanh.",
      okText: "Đồng ý",
      cancelText: "Bỏ qua",
      okButtonProps: { danger: stop },
      onOk: async () => {
        try {
          const saved = stop ? await catalogueApi.discontinueProduct(id) : await catalogueApi.reactivateProduct(id);
          onProductChange(saved);
          message.success(stop ? "Đã ngừng kinh doanh" : "Đã kinh doanh lại");
        } catch (error) {
          onProblem(describeFailure(error, undefined));
        }
      },
    });
  }

  const historyColumns: TableColumnsType<AdminProduct["priceHistory"][number]> = [
    { title: "Mã hàng", dataIndex: "skuCode", render: (v: string) => <span className={styles.mono}>{v}</span> },
    { title: "Loại", dataIndex: "field", width: 90, render: (v: string) => (v === "PROMO" ? "Giá KM" : "Giá") },
    { title: "Giá cũ", dataIndex: "oldPrice", align: "right", width: 110, render: (v: number | null) => (v === null ? "-" : formatNumber(v)) },
    { title: "Giá mới", dataIndex: "newPrice", align: "right", width: 110, render: (v: number | null) => (v === null ? "-" : formatNumber(v)) },
    { title: "Người đổi", dataIndex: "changedBy", width: 160, render: (v: string | null) => v ?? "Hệ thống" },
    { title: "Thời điểm", dataIndex: "changedAt", width: 150, render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm") },
  ];

  const infoTab = (
    <>
      {productNotices.length > 0 && (
        <Alert type="warning" showIcon style={{ marginTop: 12 }} title={productNotices.join(" ")} />
      )}
      <div className={styles.infoGrid}>
        <div>
          <Form.Item label="Tên hàng" name="name" rules={[{ required: true, whitespace: true, message: "Nhập tên hàng" }]}>
            <Input maxLength={255} />
          </Form.Item>
          <div className={styles.f2}>
            <div>
              <div className={styles.fieldLabel}>
                <span>Nhóm hàng</span>
                <button type="button" className={styles.fieldLink} onClick={() => setCategoryDialog(true)}>
                  Tạo mới
                </button>
              </div>
              <Form.Item name="categoryId">
                <TreeSelect
                  treeData={categoryNodes}
                  treeDefaultExpandAll
                  showSearch
                  treeNodeFilterProp="title"
                  allowClear
                  placeholder="Chọn nhóm hàng"
                  loading={categories.isPending}
                />
              </Form.Item>
            </div>
            <div>
              <div className={styles.fieldLabel}>
                <span>Thương hiệu</span>
                <button type="button" className={styles.fieldLink} onClick={() => setBrandDialog(true)}>
                  Tạo mới
                </button>
              </div>
              <Form.Item name="brandId">
                <Select options={brandOptions} showSearch optionFilterProp="label" allowClear placeholder="Chọn thương hiệu" loading={brands.isPending} />
              </Form.Item>
            </div>
          </div>
          <div className={styles.f2}>
            <Form.Item label="Dòng thông số" name="specLine">
              <Input maxLength={255} placeholder="VD: 465 tờ, 4 lớp" />
            </Form.Item>
            <Form.Item label="Đường dẫn ảnh" name="imageUrl">
              <Input maxLength={500} placeholder="/uploads/... hoặc https://..." />
            </Form.Item>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 14, marginBottom: 8 }}>Ảnh sản phẩm</div>
          <div className={styles.imgBox}>
            {/* Admin preview of an arbitrary URL; next/image would need every host whitelisted. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl || PLACEHOLDER_IMAGE} alt="" />
          </div>
          {!imageUrl && <div className={styles.imgWarn}>Chưa có ảnh</div>}
        </div>
      </div>

      <SectionCard title="Quy cách & giá" subtitle="Mã hàng là mã duy nhất. Giá đã gồm VAT. Đơn giá/gói tự tính.">
        <SkuPriceTable rows={rows} canEditPrice={isManager} warnings={liveWarnings} />
        <PriceWarningBox warnings={liveWarnings} serverMessages={serverMessages} thresholdPct={threshold} />
        {!isManager && (
          <Alert type="info" showIcon style={{ marginTop: 10 }} title="Chỉ quản lý được sửa giá, khuyến mại, quy cách và cờ xác nhận." />
        )}
      </SectionCard>

      <SectionCard title="Ghi chú nội bộ" subtitle="Chỉ quản trị thấy, không hiện trên web">
        <Form.Item name="internalNote" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={3} maxLength={2000} />
        </Form.Item>
      </SectionCard>

      {!isNew && (
        <SectionCard title="Lịch sử giá" subtitle="50 thay đổi gần nhất" defaultOpen={false}>
          <Table
            size="small"
            pagination={false}
            rowKey={(r) => `${r.skuCode}-${r.field}-${r.changedAt}`}
            dataSource={product.priceHistory}
            columns={historyColumns}
            locale={{ emptyText: "Chưa có thay đổi giá" }}
          />
        </SectionCard>
      )}
    </>
  );

  return (
    <Form<ProductFormValues> form={form} layout="vertical" initialValues={initial} autoComplete="off" requiredMark>
      {problem && (
        <div className={styles.problem}>
          <Alert
            type="error"
            showIcon
            title={problem.title}
            description={
              problem.items.length > 0 ? (
                <ul className={styles.errorList}>
                  {problem.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : undefined
            }
            action={
              problem.kind === "conflict" ? (
                <Button size="small" type="primary" onClick={() => void onReload()}>
                  Tải lại
                </Button>
              ) : undefined
            }
          />
        </div>
      )}
      <Tabs
        className={styles.editorTabs}
        activeKey={tab}
        onChange={onTabChange}
        items={[
          { key: "info", label: "Thông tin", forceRender: true, children: infoTab },
          {
            key: "desc",
            label: "Mô tả",
            forceRender: true,
            children: (
              <Form.Item label="Mô tả (Markdown)" name="descriptionMd" style={{ marginTop: 12 }}>
                <Input.TextArea rows={16} />
              </Form.Item>
            ),
          },
          {
            key: "seo",
            label: "SEO",
            forceRender: true,
            children: (
              <div style={{ marginTop: 12 }}>
                <Form.Item label="Tiêu đề SEO" name="seoTitle">
                  <Input maxLength={255} />
                </Form.Item>
                <Form.Item label="Mô tả SEO" name="seoDescription">
                  <Input.TextArea rows={3} maxLength={500} />
                </Form.Item>
              </div>
            ),
          },
        ]}
      />
      <div className={styles.footer}>
        <div className={styles.footLeft}>
          <Checkbox checked={published} disabled={!isManager || discontinued} onChange={(e) => setPublished(e.target.checked)}>
            Hiển thị trên web
          </Checkbox>
          <Tooltip
            title={
              isManager
                ? "Chỉ hiện khi có nhóm hàng và ít nhất một quy cách đang hiện có giá"
                : "Chỉ quản lý được đổi trạng thái hiển thị"
            }
          >
            <InfoCircleOutlined style={{ color: "#6B7280" }} />
          </Tooltip>
          {!isNew && isManager && (
            <Button danger={!discontinued} onClick={() => changeStatus(discontinued ? "reactivate" : "discontinue")}>
              {discontinued ? "Kinh doanh lại" : "Ngừng kinh doanh"}
            </Button>
          )}
        </div>
        <Button onClick={onClose}>Bỏ qua</Button>
        <Button type="primary" loading={saving} onClick={() => void save()}>
          Lưu
        </Button>
      </div>

      <CategoryDialog
        open={categoryDialog}
        onClose={() => setCategoryDialog(false)}
        onSaved={(created) => form.setFieldValue("categoryId", created.id)}
      />
      <BrandDialog open={brandDialog} onClose={() => setBrandDialog(false)} onSaved={(created) => form.setFieldValue("brandId", created.id)} />
    </Form>
  );
}
