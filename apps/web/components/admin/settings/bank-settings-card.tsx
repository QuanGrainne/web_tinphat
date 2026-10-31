"use client";

import { useState } from "react";
import { Alert, App, Button, Form, Input } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { ApiProblem } from "@/lib/admin/api-client";
import { settingsKeys, updateBankSettings } from "@/lib/admin/settings-api";
import type { AdminSettings, BankInfo } from "@/lib/api/types";
import { errorMessage } from "@/components/admin/requests/error-message";
import {
  ACCOUNT_NO_PATTERN,
  BIN_PATTERN,
  isBankFormDirty,
  isBankFormField,
  normalizeAccountName,
  toBankUpdate,
  type BankFormValues,
} from "./bank-form-rules";
import s from "./settings.module.css";

const TITLE = "Tài khoản ngân hàng nhận tiền";

function BankReadOnly({ bank }: { bank: BankInfo }) {
  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>{TITLE}</h2>
      <p className={s.cardNote}>Chỉ quản lý được sửa thông tin này.</p>
      <div className={s.rows}>
        <div><span>Ngân hàng</span><span>{bank.bankName}</span></div>
        <div><span>Mã BIN</span><span className={`${s.mono} ${s.num}`}>{bank.bin}</span></div>
        <div><span>Số tài khoản</span><span className={`${s.mono} ${s.num}`}>{bank.accountNo}</span></div>
        <div><span>Tên tài khoản</span><span>{bank.accountName}</span></div>
      </div>
    </section>
  );
}

function BankForm({ bank }: { bank: BankInfo }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<BankFormValues>();
  const watched = Form.useWatch([], form);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = isBankFormDirty(bank, watched);

  async function save(values: BankFormValues) {
    setSaving(true);
    setError(null);
    try {
      const saved = await updateBankSettings(toBankUpdate(values));
      queryClient.setQueryData<AdminSettings>(settingsKeys.admin(), (old) => (old ? { ...old, bank: saved } : old));
      form.setFieldsValue({ ...saved, currentPassword: "" });
      message.success("Đã lưu tài khoản ngân hàng");
    } catch (e) {
      setError(errorMessage(e));
      form.setFieldValue("currentPassword", "");
      if (e instanceof ApiProblem) {
        const fields = e.fieldErrors.filter((fe) => isBankFormField(fe.field));
        if (fields.length > 0) form.setFields(fields.map((fe) => ({ name: fe.field as keyof BankFormValues, errors: [fe.message] })));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>{TITLE}</h2>
      <p className={s.cardNote}>Mã QR và nội dung chuyển khoản hiển thị cho khách dùng đúng các thông tin này.</p>
      <Alert
        type="warning"
        showIcon
        title="Kiểm tra kỹ trước khi lưu"
        description="Sai số tài khoản thì khách chuyển nhầm tiền. Đổi tài khoản cũng cần cập nhật bên SePay và cấu hình máy chủ (DNA_SEPAY_ACCOUNT_NO); chưa khớp thì giao dịch vào tab Giao dịch ngân hàng để duyệt tay."
        style={{ marginBottom: 16 }}
      />
      <Form<BankFormValues>
        form={form}
        layout="vertical"
        autoComplete="off"
        initialValues={{ ...bank, currentPassword: "" }}
        onFinish={save}
        disabled={saving}
      >
        <div className={s.grid2}>
          <Form.Item name="bankName" label="Ngân hàng" rules={[{ required: true, whitespace: true, message: "Nhập tên ngân hàng." }]}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            name="bin"
            label="Mã BIN"
            extra="6 chữ số do ngân hàng cấp."
            rules={[
              { required: true, message: "Nhập mã BIN." },
              { pattern: BIN_PATTERN, message: "Mã BIN gồm đúng 6 chữ số." },
            ]}
          >
            <Input maxLength={6} inputMode="numeric" />
          </Form.Item>
          <Form.Item
            name="accountNo"
            label="Số tài khoản"
            rules={[
              { required: true, message: "Nhập số tài khoản." },
              { pattern: ACCOUNT_NO_PATTERN, message: "Số tài khoản gồm 4 đến 19 chữ số, không có khoảng trắng." },
            ]}
          >
            <Input maxLength={19} inputMode="numeric" />
          </Form.Item>
          <Form.Item
            name="accountName"
            label="Tên tài khoản"
            extra="Viết hoa, không dấu, đúng tên chủ tài khoản tại ngân hàng."
            normalize={(value: string | undefined) => normalizeAccountName(value ?? "")}
            rules={[{ required: true, whitespace: true, message: "Nhập tên tài khoản." }]}
          >
            <Input maxLength={100} />
          </Form.Item>
        </div>
        <Form.Item
          name="currentPassword"
          label="Mật khẩu hiện tại"
          extra="Nhập mật khẩu đăng nhập của bạn để xác nhận thay đổi."
          rules={[{ required: true, message: "Nhập mật khẩu hiện tại để lưu." }]}
        >
          <Input.Password autoComplete="current-password" maxLength={200} />
        </Form.Item>
        {error && <Alert type="error" showIcon title={error} role="alert" style={{ marginBottom: 12 }} />}
        <div className={s.actions}>
          <Button type="primary" htmlType="submit" loading={saving} disabled={!dirty}>
            Lưu thay đổi
          </Button>
        </div>
      </Form>
    </section>
  );
}

/** Receiving bank account: MANAGER edits it (password re-entry), anyone else sees it read-only. */
export function BankSettingsCard({ bank, canEdit }: { bank: BankInfo; canEdit: boolean }) {
  return canEdit ? <BankForm bank={bank} /> : <BankReadOnly bank={bank} />;
}
