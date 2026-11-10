"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, Button, Form, Input } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { AuthCard } from "@/components/admin/auth-card";
import { adminApi, ApiProblem } from "@/lib/admin/api-client";

interface Values {
  newPassword: string;
  confirmPassword: string;
}

const MIN_LENGTH = 8;
const MAX_BYTES = 72;

/** Opened from the emailed link (?token=...). Sets a new password; the link works once. */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthCard title="Đặt lại mật khẩu">{null}</AuthCard>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const params = useSearchParams();
  // read once: the address bar is cleared below, and the token must survive that
  const [token] = useState<string | null>(() => params.get("token")?.trim() || null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    // keep the one-time token out of the address bar and the browser history
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function onFinish(values: Values) {
    if (!token) return;
    setSaving(true);
    setFailure(null);
    try {
      await adminApi.confirmPasswordReset(token, values.newPassword);
      setDone(true);
    } catch (error) {
      setFailure(error instanceof ApiProblem ? error.message : "Không đặt lại được mật khẩu. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthCard title="Đặt lại mật khẩu">
      {done ? (
        <>
          <Alert type="success" showIcon title="Đã đặt mật khẩu mới" description="Mọi phiên đăng nhập cũ của tài khoản đã kết thúc. Hãy đăng nhập bằng mật khẩu mới." />
          <Link href="/admin/login">
            <Button type="primary" block style={{ marginTop: 20 }}>
              Đăng nhập
            </Button>
          </Link>
        </>
      ) : token === null ? (
        <>
          <Alert type="error" showIcon title="Liên kết không hợp lệ" description="Liên kết thiếu mã. Hãy mở lại liên kết trong email, hoặc yêu cầu liên kết mới." />
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link href="/admin/forgot-password">Yêu cầu liên kết mới</Link>
          </div>
        </>
      ) : (
        <>
          {failure && (
            <Alert
              type="error"
              showIcon
              title={failure}
              style={{ marginBottom: 16 }}
              action={<Link href="/admin/forgot-password">Gửi lại</Link>}
            />
          )}
          <Form<Values> layout="vertical" onFinish={onFinish} requiredMark={false} disabled={saving}>
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
              <Input.Password prefix={<LockOutlined />} autoComplete="new-password" autoFocus />
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
              <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={saving}>
              Đặt mật khẩu mới
            </Button>
          </Form>
        </>
      )}
    </AuthCard>
  );
}
