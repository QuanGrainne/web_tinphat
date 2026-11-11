"use client";

import { useState } from "react";
import { Alert, App, Button, Form, Input, Skeleton } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchContactSettings,
  settingsKeys,
  updateContactSettings,
} from "@/lib/admin/settings-api";
import type { ContactSettings } from "@/lib/api/types";
import {
  facebookHref,
  isWechatId,
  telHref,
  whatsappHref,
  zaloHref,
} from "@/lib/order/phone";
import { errorMessage } from "@/components/admin/requests/error-message";
import { useAdminSession } from "@/components/admin/requests/use-admin-session";
import s from "./settings.module.css";

const PHONE = /^\+?[0-9 .\-()]+$/;
const digitCount = (value: string) => value.replace(/\D/g, "").length;

/** Up to 12 digits for Vietnamese numbers; WhatsApp takes foreign numbers too, up to 15. */
function phoneRule(label: string, maxDigits = 12, example = "0914 794 472") {
  return {
    validator: (_: unknown, value: string | undefined) => {
      const v = (value ?? "").trim();
      if (!v) return Promise.resolve();
      return PHONE.test(v) && digitCount(v) >= 9 && digitCount(v) <= maxDigits
        ? Promise.resolve()
        : Promise.reject(new Error(`${label} không hợp lệ. Ví dụ: ${example}`));
    },
  };
}

/** A link to try the value the admin typed; nothing when it is not usable yet. */
function TryLink({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      Mở thử ↗
    </a>
  );
}

function ContactForm({ initial }: { initial: ContactSettings }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ContactSettings>();
  const [saving, setSaving] = useState(false);
  const hotline = Form.useWatch("hotline", form) ?? initial.hotline;
  const zalo = Form.useWatch("zalo", form) ?? initial.zalo;
  const facebook = Form.useWatch("facebook", form) ?? initial.facebook;
  const whatsapp = Form.useWatch("whatsapp", form) ?? initial.whatsapp;

  async function onFinish(values: ContactSettings) {
    setSaving(true);
    try {
      const saved = await updateContactSettings({
        hotline: values.hotline.trim(),
        zalo: (values.zalo ?? "").trim(),
        facebook: (values.facebook ?? "").trim(),
        whatsapp: (values.whatsapp ?? "").trim(),
        wechat: (values.wechat ?? "").trim(),
        email: values.email.trim(),
        address: values.address.trim(),
      });
      queryClient.setQueryData(settingsKeys.contact(), saved);
      form.setFieldsValue(saved);
      message.success("Đã lưu. Trang web hiển thị thông tin mới ngay.");
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form<ContactSettings>
      form={form}
      layout="vertical"
      initialValues={initial}
      onFinish={onFinish}
      requiredMark={false}
      disabled={saving}
    >
      <section className={s.card}>
        <h2 className={s.cardTitle}>Điện thoại và mạng xã hội</h2>
        <p className={s.cardNote}>
          Hiện ở đầu trang, phần Liên hệ, chân trang và các nút nổi Gọi, Zalo,
          Facebook, WhatsApp.
        </p>
        <Form.Item
          label="Số hotline"
          name="hotline"
          extra={
            <TryLink
              href={
                hotline && PHONE.test(hotline.trim()) ? telHref(hotline) : null
              }
            />
          }
          rules={[
            { required: true, whitespace: true, message: "Nhập số hotline" },
            phoneRule("Số hotline"),
          ]}
        >
          <Input placeholder="0914 794 472" maxLength={20} />
        </Form.Item>
        <Form.Item
          label="Zalo"
          name="zalo"
          extra={
            <span>
              Nhập số điện thoại Zalo, hoặc dán link dạng https://zalo.me/...
              (nhóm, trang Zalo OA). Để trống để ẩn nút Zalo.{" "}
              <TryLink href={zaloHref(zalo ?? "")} />
            </span>
          }
          rules={[
            {
              validator: (_, value: string | undefined) => {
                const v = (value ?? "").trim();
                if (!v) return Promise.resolve();
                if (/^https?:\/\//i.test(v)) {
                  return zaloHref(v)
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error("Link Zalo phải có dạng https://zalo.me/..."),
                      );
                }
                return phoneRule("Số Zalo").validator(_, v);
              },
            },
          ]}
        >
          <Input
            placeholder="0914 794 472 hoặc https://zalo.me/..."
            maxLength={200}
          />
        </Form.Item>
        <Form.Item
          label="Link Facebook"
          name="facebook"
          extra={
            <span>
              Mở trang Facebook của công ty, chép địa chỉ trên thanh trình duyệt
              rồi dán vào đây. Để trống để ẩn.{" "}
              <TryLink href={facebookHref(facebook ?? "")} />
            </span>
          }
          rules={[
            {
              validator: (_, value: string | undefined) => {
                const v = (value ?? "").trim();
                return !v || facebookHref(v)
                  ? Promise.resolve()
                  : Promise.reject(
                      new Error(
                        "Link Facebook phải có dạng https://www.facebook.com/ten-trang",
                      ),
                    );
              },
            },
          ]}
        >
          <Input
            placeholder="https://www.facebook.com/tinphatdecor"
            maxLength={300}
          />
        </Form.Item>
        <Form.Item
          label="WhatsApp"
          name="whatsapp"
          extra={
            <span>
              Nhập số điện thoại WhatsApp (số nước ngoài thì ghi cả mã nước, ví
              dụ +86 ...), hoặc dán link dạng https://wa.me/... Để trống để ẩn
              nút WhatsApp. <TryLink href={whatsappHref(whatsapp ?? "")} />
            </span>
          }
          rules={[
            {
              validator: (_, value: string | undefined) => {
                const v = (value ?? "").trim();
                if (!v) return Promise.resolve();
                if (/^https?:\/\//i.test(v)) {
                  return whatsappHref(v)
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(
                          "Link WhatsApp phải có dạng https://wa.me/84914794472",
                        ),
                      );
                }
                return phoneRule("Số WhatsApp", 15, "+84 914 794 472").validator(
                  _,
                  v,
                );
              },
            },
          ]}
        >
          <Input
            placeholder="+84 914 794 472 hoặc https://wa.me/..."
            maxLength={200}
          />
        </Form.Item>
        <Form.Item
          label="WeChat"
          name="wechat"
          extra="Nhập WeChat ID (hoặc số điện thoại đăng ký WeChat). WeChat không có link mở chat từ trang web, nên web hiện ID kèm nút Sao chép để khách dán vào WeChat tìm. Để trống để ẩn."
          rules={[
            {
              validator: (_, value: string | undefined) => {
                const v = (value ?? "").trim();
                return !v || isWechatId(v)
                  ? Promise.resolve()
                  : Promise.reject(
                      new Error(
                        "WeChat ID gồm 6–20 ký tự, bắt đầu bằng chữ cái, chỉ có chữ, số, _ hoặc -; hoặc nhập số điện thoại WeChat",
                      ),
                    );
              },
            },
          ]}
        >
          <Input placeholder="tinphat_decor" maxLength={40} />
        </Form.Item>
      </section>

      <section className={s.card} style={{ marginTop: 12 }}>
        <h2 className={s.cardTitle}>Email và địa chỉ</h2>
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, whitespace: true, message: "Nhập email" },
            { type: "email", message: "Email không hợp lệ" },
          ]}
        >
          <Input placeholder="tinphatdecord@gmail.com" maxLength={200} />
        </Form.Item>
        <Form.Item
          label="Địa chỉ"
          name="address"
          rules={[
            { required: true, whitespace: true, message: "Nhập địa chỉ" },
          ]}
        >
          <Input
            placeholder="Cầu chợ Trâu, Hải Hưng, Ninh Bình"
            maxLength={300}
          />
        </Form.Item>
      </section>

      <div style={{ marginTop: 16 }}>
        <Button type="primary" htmlType="submit" loading={saving}>
          Lưu thông tin liên hệ
        </Button>
      </div>
    </Form>
  );
}

/** /admin/contact: the storefront's hotline, Zalo, Facebook, WhatsApp, WeChat, email and address. Managers edit; editors are told why not. */
export function ContactSettingsScreen() {
  const session = useAdminSession();
  const isManager = session.data?.role === "MANAGER";
  const contact = useQuery({
    queryKey: settingsKeys.contact(),
    queryFn: fetchContactSettings,
    enabled: isManager,
  });

  return (
    <div className={s.page}>
      <h1 className={s.title}>Thông tin liên hệ</h1>
      <div className={s.stack}>
        {session.data && !isManager && (
          <Alert
            type="info"
            showIcon
            title="Chỉ quản lý được xem và sửa thông tin liên hệ."
          />
        )}
        {contact.isError && (
          <Alert
            type="error"
            showIcon
            title={errorMessage(contact.error)}
            action={
              <Button size="small" onClick={() => void contact.refetch()}>
                Thử lại
              </Button>
            }
          />
        )}
        {(session.isPending || (isManager && contact.isPending)) && (
          <div className={s.card}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        )}
        {contact.data && <ContactForm initial={contact.data} />}
      </div>
    </div>
  );
}
