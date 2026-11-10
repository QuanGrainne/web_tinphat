"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Form, Input } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { AuthCard } from "@/components/admin/auth-card";
import { adminApi, ApiProblem } from "@/lib/admin/api-client";

/** Asks for the recovery email; the answer is the same whether or not it belongs to an account. */
export default function ForgotPasswordPage() {
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  async function onFinish({ email }: { email: string }) {
    setSending(true);
    setFailure(null);
    try {
      await adminApi.requestPasswordReset(email.trim());
      setSentTo(email.trim());
    } catch (error) {
      setFailure(error instanceof ApiProblem ? error.message : "Không gửi được yêu cầu. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthCard title="Quên mật khẩu">
      {sentTo ? (
        <>
          <Alert
            type="success"
            showIcon
            title="Đã gửi yêu cầu"
            description={`Nếu ${sentTo} là email khôi phục của một tài khoản quản trị, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút. Liên kết có hiệu lực 30 phút. Hãy kiểm tra cả thư mục Spam.`}
          />
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link href="/admin/login">Quay lại đăng nhập</Link>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 16px", color: "#57534E" }}>Nhập email khôi phục của tài khoản. Chúng tôi sẽ gửi liên kết để đặt mật khẩu mới.</p>
          {failure && <Alert type="error" showIcon title={failure} style={{ marginBottom: 16 }} />}
          <Form<{ email: string }> layout="vertical" onFinish={onFinish} requiredMark={false} disabled={sending}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, whitespace: true, message: "Nhập email" },
                { type: "email", message: "Email không hợp lệ" },
              ]}
            >
              <Input prefix={<MailOutlined />} type="email" autoComplete="email" autoFocus />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={sending}>
              Gửi liên kết đặt lại mật khẩu
            </Button>
          </Form>
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <Link href="/admin/login">Quay lại đăng nhập</Link>
          </div>
        </>
      )}
    </AuthCard>
  );
}
