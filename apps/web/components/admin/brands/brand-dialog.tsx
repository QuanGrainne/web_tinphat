"use client";

import { useState } from "react";
import { Alert, App, Form, Input, Modal, Switch } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { catalogueApi } from "@/lib/admin/catalogue-api";
import { catalogueKeys } from "@/lib/admin/catalogue-queries";
import type { AdminBrand } from "@/lib/api/types";
import { readProblem } from "../products/form-errors";

interface BrandFormValues {
  name: string;
  visible: boolean;
}

/** Create (name only) or edit (name + Hiển thị) dialog, also used as the quick-create from the product editor. */
export function BrandDialog({
  brand,
  open,
  onClose,
  onSaved,
}: {
  /** Null/undefined = create. */
  brand?: AdminBrand | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (brand: AdminBrand) => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<BrandFormValues>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = !!brand;

  async function submit() {
    let values: BrandFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const name = values.name.trim();
      const saved = brand
        ? await catalogueApi.updateBrand(brand.id, { name, visible: values.visible })
        : await catalogueApi.createBrand({ name });
      await queryClient.invalidateQueries({ queryKey: catalogueKeys.brands });
      message.success(editing ? "Đã lưu thương hiệu" : "Đã tạo thương hiệu");
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
      title={editing ? "Sửa thương hiệu" : "Tạo thương hiệu"}
      width={450}
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
      <Form<BrandFormValues>
        form={form}
        layout="vertical"
        initialValues={{ name: brand?.name ?? "", visible: brand?.visible ?? true }}
        onFinish={() => void submit()}
      >
        <Form.Item label="Tên thương hiệu" name="name" rules={[{ required: true, whitespace: true, message: "Nhập tên thương hiệu" }]}>
          <Input maxLength={120} autoFocus />
        </Form.Item>
        {editing && (
          <Form.Item label="Hiển thị trên web" name="visible" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
