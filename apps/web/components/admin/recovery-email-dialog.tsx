"use client";

import { useEffect, useState } from "react";
import { Alert, App, Form, Input, Modal, Spin } from "antd";
import { ApiProblem, adminApi } from "@/lib/admin/api-client";

interface Values {
  email: string;
  currentPassword: string;
}

/** Sets the address that "Quên mật khẩu" sends the reset link to. Needs the current password. */
export function RecoveryEmailDialog({ onClose }: { onClose: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getRecoveryEmail()
      .then(({ email }) => form.setFieldValue("email", email ?? ""))
      .catch(() => setError("Không tải được email hiện tại."))
      .finally(() => setLoading(false));
  }, [form]);

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
      const { email } = await adminApi.setRecoveryEmail(values.email.trim(), values.currentPassword);
      message.success(email ? "Đã lưu email lấy lại mật khẩu" : "Đã xóa email lấy lại mật khẩu");
      onClose();
    } catch (e) {
      if (e instanceof ApiProblem && e.status === 403) {
        form.setFields([{ name: "currentPassword", errors: ["Mật khẩu hiện tại không đúng."] }]);
      } else if (e instanceof ApiProblem && e.fieldErrors.some((f) => f.field === "email")) {
        form.setFields([{ name: "email", errors: [e.message] }]);
      } else {
        setError(e instanceof ApiProblem ? e.message : "Không lưu được email.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title="Email lấy lại mật khẩu"
      width={460}
      centered
      destroyOnHidden
      mask={{ closable: false }}
      okText="Lưu"
      cancelText="Bỏ qua"
      confirmLoading={saving}
      okButtonProps={{ disabled: loading }}
      onOk={() => void submit()}
      onCancel={onClose}
    >
      <p style={{ margin: "0 0 12px", color: "#57534E" }}>Khi quên mật khẩu, liên kết đặt lại sẽ được gửi tới email này. Để trống nếu muốn xóa.</p>
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
      <Spin spinning={loading}>
        <Form<Values> form={form} layout="vertical" onFinish={() => void submit()} autoComplete="off">
          <Form.Item label="Email" name="email" rules={[{ type: "email", message: "Email không hợp lệ" }]}>
            <Input type="email" autoComplete="email" placeholder="vd: tinphatdecord@gmail.com" />
          </Form.Item>
          <Form.Item label="Mật khẩu hiện tại" name="currentPassword" rules={[{ required: true, message: "Nhập mật khẩu hiện tại để xác nhận" }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
}
