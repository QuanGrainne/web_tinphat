"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Form, Input } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi, ApiProblem } from "@/lib/admin/api-client";
import { safeNextPath } from "@/lib/admin/login-redirect";
import { SESSION_QUERY_KEY } from "@/lib/admin/use-session";

const GENERIC_FAILURE = "Tên đăng nhập hoặc mật khẩu không đúng";

interface LoginValues {
  username: string;
  password: string;
}

/** One message for every credential failure; only the rate-limit answer and an unreachable server say something different. */
function failureMessage(error: unknown): string {
  if (error instanceof ApiProblem) {
    if (error.status === 429) return error.message;
    if (error.status === 0 || error.status >= 500) return error.message;
  }
  return GENERIC_FAILURE;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function onFinish(values: LoginValues) {
    setSubmitting(true);
    setFailure(null);
    try {
      const session = await adminApi.login(values.username.trim(), values.password);
      queryClient.setQueryData(SESSION_QUERY_KEY, session);
      router.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")));
    } catch (error) {
      setFailure(failureMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#F3F4F6", padding: 24 }}>
      <Card style={{ width: 380, borderRadius: 8 }} styles={{ body: { padding: 32 } }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1 }}>TÍN PHÁT</div>
          <div style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>Quản trị catalogue</div>
          <h1 style={{ margin: "20px 0 0", fontSize: 20, fontWeight: 700 }}>Đăng nhập</h1>
        </div>
        {failure && <Alert type="error" showIcon title={failure} style={{ marginBottom: 16 }} />}
        <Form<LoginValues> layout="vertical" onFinish={onFinish} requiredMark={false} disabled={submitting}>
          <Form.Item label="Tên đăng nhập" name="username" rules={[{ required: true, whitespace: true, message: "Nhập tên đăng nhập" }]}>
            <Input prefix={<UserOutlined />} autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: "Nhập mật khẩu" }]} style={{ marginBottom: 8 }}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <Link href="/admin/forgot-password">Quên mật khẩu?</Link>
          </div>
          <Button type="primary" htmlType="submit" block loading={submitting} style={{ marginTop: 8 }}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </main>
  );
}
