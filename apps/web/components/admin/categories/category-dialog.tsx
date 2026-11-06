"use client";

import { useState } from "react";
import { Alert, App, Form, Input, InputNumber, Modal, Select, Switch } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { catalogueApi } from "@/lib/admin/catalogue-api";
import { catalogueKeys, useCategories } from "@/lib/admin/catalogue-queries";
import type { AdminCategory } from "@/lib/api/types";
import { ImageUpload } from "../image-upload";
import { readProblem } from "../products/form-errors";

interface CategoryFormValues {
  name: string;
  parentId: number | null;
  description: string | null;
  imageUrl: string | null;
  visible: boolean;
  sortOrder: number | null;
}

/** Create or edit a category with its cover image and description. Also used as the quick-create from the product editor. */
export function CategoryDialog({
  category,
  open,
  onClose,
  onSaved,
}: {
  /** Null/undefined = create. */
  category?: Omit<AdminCategory, "children"> | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (category: AdminCategory) => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const categories = useCategories();
  const [form] = Form.useForm<CategoryFormValues>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = !!category;

  // Depth is limited to two levels, so only level-1 groups can be a parent.
  const parentOptions = [
    { value: 0, label: "Không có (danh mục chính)" },
    ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  async function submit() {
    let values: CategoryFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const name = values.name.trim();
      const description = values.description?.trim() ? values.description.trim() : null;
      const imageUrl = values.imageUrl ?? null;
      const saved = category
        ? await catalogueApi.updateCategory(category.id, {
            name,
            description,
            imageUrl,
            visible: values.visible,
            sortOrder: values.sortOrder ?? 0,
          })
        : await catalogueApi.createCategory({ name, parentId: values.parentId ? values.parentId : null, description, imageUrl });
      await queryClient.invalidateQueries({ queryKey: catalogueKeys.categories });
      message.success(editing ? "Đã lưu danh mục" : "Đã tạo danh mục");
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setError(readProblem(e, form).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={editing ? "Sửa danh mục" : "Tạo danh mục"}
      width={620}
      centered
      destroyOnHidden
      mask={{ closable: false }}
      okText="Lưu"
      cancelText="Bỏ qua"
      confirmLoading={saving}
      onOk={() => void submit()}
      onCancel={onClose}
    >
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
      <Form<CategoryFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          name: category?.name ?? "",
          parentId: 0,
          description: category?.description ?? null,
          imageUrl: category?.imageUrl ?? null,
          visible: category?.visible ?? true,
          sortOrder: category?.sortOrder ?? 0,
        }}
        onFinish={() => void submit()}
      >
        <Form.Item label="Tên danh mục" name="name" rules={[{ required: true, whitespace: true, message: "Nhập tên danh mục" }]}>
          <Input maxLength={120} autoFocus />
        </Form.Item>
        <Form.Item label="Ảnh đại diện" name="imageUrl">
          <ImageUpload />
        </Form.Item>
        <Form.Item label="Mô tả ngắn" name="description" extra="Hiện trên thẻ danh mục và đầu trang danh mục.">
          <Input.TextArea rows={3} maxLength={2000} />
        </Form.Item>
        {editing ? (
          <div style={{ display: "flex", gap: 32 }}>
            <Form.Item label="Hiển thị trên web" name="visible" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="Thứ tự" name="sortOrder">
              <InputNumber min={0} max={9999} precision={0} style={{ width: 120 }} />
            </Form.Item>
          </div>
        ) : (
          <Form.Item label="Danh mục cha" name="parentId">
            <Select options={parentOptions} loading={categories.isPending} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
