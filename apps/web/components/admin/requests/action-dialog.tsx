"use client";

import { useState, type ReactNode } from "react";
import { Alert, Modal } from "antd";
import { errorMessage } from "./error-message";
import s from "./requests.module.css";

interface ActionDialogProps {
  title: string;
  okText: string;
  /** Red confirm button (cancel, dismiss). */
  danger?: boolean;
  /** Label of the close button; "Bỏ qua" unless that word names the action itself. */
  cancelText?: string;
  width?: number;
  /** Resolve `true` to close, `false` to stay open (field errors already shown); throw an `ApiProblem` to show its text. */
  onSubmit: () => Promise<boolean>;
  onClose: () => void;
  children: ReactNode;
}

/** Small centred dialog: Bỏ qua / confirm, busy state while saving, server error shown inline. Mount it only while open. */
export function ActionDialog({ title, okText, danger, cancelText = "Bỏ qua", width = 480, onSubmit, onClose, children }: ActionDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOk() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      if (await onSubmit()) {
        onClose();
        return;
      }
    } catch (e) {
      setError(errorMessage(e));
    }
    setPending(false);
  }

  return (
    <Modal
      open
      centered
      width={width}
      title={title}
      okText={okText}
      cancelText={cancelText}
      onOk={handleOk}
      onCancel={() => {
        if (!pending) onClose();
      }}
      confirmLoading={pending}
      okButtonProps={{ danger }}
      cancelButtonProps={{ disabled: pending }}
      mask={{ closable: false }}
      keyboard={!pending}
    >
      {children}
      {error && <Alert type="error" showIcon title={error} style={{ marginTop: 12 }} role="alert" />}
    </Modal>
  );
}

interface DialogFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

export function DialogField({ label, htmlFor, required, error, children }: DialogFieldProps) {
  return (
    <div className={s.dlgRow}>
      <label className={s.dlgLabel} htmlFor={htmlFor}>
        {label}
        {required && <span aria-hidden="true" style={{ color: "#DC2626" }}> *</span>}
      </label>
      {children}
      {error && <div className={s.dlgError} role="alert">{error}</div>}
    </div>
  );
}
