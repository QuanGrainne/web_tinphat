"use client";

import type { ReactNode } from "react";
import { statusLabel, statusTone, type BadgeTone, type RequestKind } from "@/lib/admin/order-labels";
import s from "./requests.module.css";

const TONE_CLASS: Record<BadgeTone, string> = {
  blue: s.toneBlue,
  green: s.toneGreen,
  orange: s.toneOrange,
  grey: s.toneGrey,
  red: s.toneRed,
};

export function ToneBadge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`${s.badge} ${TONE_CLASS[tone]}`}>{children}</span>;
}

export function StatusBadge({ kind, status }: { kind: RequestKind; status: string }) {
  return <ToneBadge tone={statusTone(kind, status)}>{statusLabel(kind, status)}</ToneBadge>;
}
