"use client";

import { Empty } from "antd";
import { actorLabel, historyText, type RequestKind } from "@/lib/admin/order-labels";
import type { HistoryEntry } from "@/lib/api/types";
import { formatDateTime } from "./format";
import s from "./requests.module.css";

/** "Lịch sử": newest first, one row per audit entry. */
export function HistoryList({ kind, entries }: { kind: RequestKind; entries: HistoryEntry[] }) {
  if (entries.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lịch sử" />;
  const sorted = [...entries].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return (
    <ul className={s.history}>
      {sorted.map((entry, i) => (
        <li key={`${entry.at}-${i}`}>
          <span className={`${s.muted} ${s.num}`}>{formatDateTime(entry.at)}</span>
          <span>{actorLabel(entry.actor)}</span>
          <span>
            {historyText(kind, entry)}
            {entry.note && <span className={s.historyNote}>{entry.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
