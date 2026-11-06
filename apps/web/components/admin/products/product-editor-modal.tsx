"use client";

import { useMemo, useState } from "react";
import { Alert, App, Button, Checkbox, Form, Input, InputNumber, Modal, Spin, Tabs, Tag, Tooltip, TreeSelect } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiProblem, VERSION_CONFLICT_MESSAGE } from "@/lib/admin/api-client";
import { catalogueApi } from "@/lib/admin/catalogue-api";
import {
  buildProductPayload,
  newCatalogueProduct,
  readMissing,
  toFormValues,
  type ProductFormValues,
} from "@/lib/admin/catalogue-form";
import { useCategories } from "@/lib/admin/catalogue-queries";
import { useSession } from "@/lib/admin/use-session";
import type { AdminCategory, AdminProduct } from "@/lib/api/types";
import { CategoryDialog } from "../categories/category-dialog";
import { ImageGalleryUpload } from "../image-gallery-upload";
import { readProblem } from "./form-errors";
import { SectionCard } from "./section-card";
import styles from "./products.module.css";

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

/** Catalogue editor: Thông tin / Mô tả with image upload and the publish toggle in the footer. No prices. */
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
  const [activeId, setActiveId] = useState<number | null>(productId);
  const [tab, setTab] = useState("info");
  const [problem, setProblem] = useState<EditorProblem | null>(null);
  const blank = useMemo(() => newCatalogueProduct(), []);

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
      width={1180}
      style={{ top: 16, maxWidth: "calc(100vw - 32px)" }}
      title={
        <span>
          {activeId === null ? "Tạo sản phẩm" : "Sửa sản phẩm"}
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

  const categories = useCategories();
  // New items go live on save; unticking keeps them as drafts.
  const [published, setPublished] = useState(product.id === null ? true : product.published);
  const [saving, setSaving] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState(false);

  const isNew = product.id === null;
  const discontinued = product.status === "DISCONTINUED";

  const categoryNodes = useMemo(() => toCategoryNodes(categories.data ?? []), [categories.data]);

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

    if (publishError) {
      message.warning("Đã lưu thông tin, nhưng chưa đổi được trạng thái hiển thị.");
      onProblem(publishError);
      onProductChange(latest);
      setSaving(false);
      return;
    }
    onProductChange(latest);
    message.success("Đã lưu sản phẩm");
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
      title: stop ? "Ngừng kinh doanh sản phẩm này?" : "Kinh doanh lại sản phẩm này?",
      content: stop
        ? "Sản phẩm sẽ không còn nằm trong danh mục trên website. Bạn có thể kinh doanh lại sau."
        : "Sản phẩm trở lại trạng thái đang kinh doanh.",
      okText: "Đồng ý",
      cancelText: "Bỏ qua",
      okButtonProps: { danger: stop },
      onOk: async () => {
        onProblem(null);
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

  const infoTab = (
    <>
      {productNotices.length > 0 && (
        <Alert type="warning" showIcon style={{ marginTop: 12 }} title={productNotices.join(" ")} />
      )}
      <div className={styles.infoGrid}>
        <div>
          <Form.Item label="Tên sản phẩm" name="name" rules={[{ required: true, whitespace: true, message: "Nhập tên sản phẩm" }]}>
            <Input maxLength={255} />
          </Form.Item>
          <div className={styles.f2}>
            <div>
              <div className={styles.fieldLabel}>
                <span>Danh mục</span>
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
                  placeholder="Chọn danh mục"
                  loading={categories.isPending}
                />
              </Form.Item>
            </div>
            <Form.Item
              label="Mã sản phẩm"
              name={["skus", 0, "code"]}
              rules={[{ required: true, whitespace: true, message: "Nhập mã sản phẩm" }]}
            >
              <Input maxLength={60} disabled={!isManager && !isNew} />
            </Form.Item>
          </div>
          <div className={styles.f2}>
            <Form.Item label="Giá" name={["skus", 0, "price"]} extra="Để trống thì web hiện Liên hệ.">
              <InputNumber<number>
                min={1}
                max={999999999999}
                precision={0}
                suffix="đ"
                style={{ width: "100%" }}
                disabled={!isManager}
                formatter={(value) => `${value ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                parser={(value) => (value ?? "").replace(/\./g, "") as unknown as number}
              />
            </Form.Item>
            <Form.Item label="Thông tin ngắn" name="specLine" extra="Hiện dưới tên sản phẩm.">
              <Input maxLength={255} />
            </Form.Item>
          </div>
        </div>
        <Form.Item label="Ảnh sản phẩm (tối đa 5)" name="images">
          <ImageGalleryUpload />
        </Form.Item>
      </div>

      <SectionCard title="Ghi chú nội bộ" subtitle="Chỉ quản trị thấy, không hiện trên web">
        <Form.Item name="internalNote" style={{ marginBottom: 0 }}>
          <Input.TextArea rows={3} maxLength={2000} />
        </Form.Item>
      </SectionCard>

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
                ? "Sản phẩm cần có danh mục để hiện trên web"
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

      {categoryDialog && (
        <CategoryDialog
          open
          onClose={() => setCategoryDialog(false)}
          onSaved={(created) => form.setFieldValue("categoryId", created.id)}
        />
      )}
    </Form>
  );
}
