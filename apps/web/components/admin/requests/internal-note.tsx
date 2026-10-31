"use client";

import { useState } from "react";
import { App, Button, Input } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { saveInternalNote } from "@/lib/admin/requests-api";
import { errorMessage } from "./error-message";
import s from "./requests.module.css";

interface Props {
  kind: "orders" | "quotes";
  id: number;
  value: string | null;
  /** Query key of the detail that holds `internalNote`, updated after a save. */
  detailKey: readonly unknown[];
}

/** Internal staff note. The draft lives locally so a background refresh never overwrites what is being typed. */
export function InternalNote({ kind, id, value, detailKey }: Props) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputId = `internal-note-${kind}-${id}`;
  const dirty = draft !== null && draft.trim() !== (value ?? "").trim();

  async function save() {
    if (draft === null || saving) return;
    const next = draft.trim();
    setSaving(true);
    try {
      await saveInternalNote(kind, id, next);
      queryClient.setQueryData<{ internalNote: string | null }>(detailKey, (old) =>
        old ? { ...old, internalNote: next === "" ? null : next } : old,
      );
      setDraft(null);
      message.success("Đã lưu ghi chú nội bộ");
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label className={s.noteLabel} htmlFor={inputId}>
        Ghi chú nội bộ
      </label>
      <Input.TextArea
        id={inputId}
        value={draft ?? value ?? ""}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Ghi chú"
      />
      {dirty && (
        <div className={s.noteActions}>
          <Button size="small" onClick={() => setDraft(null)} disabled={saving} style={{ marginRight: 8 }}>
            Bỏ qua
          </Button>
          <Button size="small" type="primary" onClick={save} loading={saving}>
            Lưu ghi chú
          </Button>
        </div>
      )}
    </div>
  );
}
