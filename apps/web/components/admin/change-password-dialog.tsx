"use client";

import { useState } from "react";
import { Alert, App, Form, Input, Modal } from "antd";
import { ApiProblem, adminApi } from "@/lib/admin/api-client";

interface Values {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const MIN_LENGTH = 8;
const MAX_BYTES = 72;

/** Change the signed-in admin's own password. The current session stays signed in; other sessions of this account end. */
export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    let values: Values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminApi.changePassword(values.currentPassword, values.newPassword);
      message.success("Đã đổi mật khẩu");
      onClose();
    } catch (e) {
      if (e instanceof ApiProblem) {
        const fields = e.fieldErrors.filter((f) => f.field === "currentPassword" || f.field === "newPassword");
        if (fields.length > 0) {
          form.setFields(fields.map((f) => ({ name: f.field as keyof Values, errors: [f.message] })));
        } else if (e.status === 403) {
          form.setFields([{ name: "currentPassword", errors: ["Mật khẩu hiện tại không đúng."] }]);
        } else {
          setError(e.message);
        }
      } else {
        setError("Không đổi được mật khẩu. Vui lòng thử lại.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title="Đổi mật khẩu"
      width={460}
      centered
      destroyOnHidden
      mask={{ closable: false }}
      okText="Đổi mật khẩu"
      cancelText="Bỏ qua"
      confirmLoading={saving}
      onOk={() => void submit()}
      onCancel={onClose}
    >
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
      <Form<Values> form={form} layout="vertical" onFinish={() => void submit()} autoComplete="off">
        <Form.Item label="Mật khẩu hiện tại" name="currentPassword" rules={[{ required: true, message: "Nhập mật khẩu hiện tại" }]}>
          <Input.Password autoComplete="current-password" autoFocus />
        </Form.Item>
        <Form.Item
          label="Mật khẩu mới"
          name="newPassword"
          extra={`Từ ${MIN_LENGTH} ký tự trở lên.`}
          rules={[
            { required: true, message: "Nhập mật khẩu mới" },
            { min: MIN_LENGTH, message: `Mật khẩu mới phải có ít nhất ${MIN_LENGTH} ký tự` },
            {
              validator: (_, value: string | undefined) =>
                !value || new TextEncoder().encode(value).length <= MAX_BYTES
                  ? Promise.resolve()
                  : Promise.reject(new Error("Mật khẩu quá dài (chữ có dấu tính 2–3 ký tự)")),
            },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="Nhập lại mật khẩu mới"
          name="confirmPassword"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "Nhập lại mật khẩu mới" },
            ({ getFieldValue }) => ({
              validator: (_, value: string | undefined) =>
                !value || value === getFieldValue("newPassword") ? Promise.resolve() : Promise.reject(new Error("Hai mật khẩu mới không khớp")),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
