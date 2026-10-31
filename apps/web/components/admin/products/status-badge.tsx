import type { ReactNode } from "react";
import styles from "./products.module.css";

const TONE_CLASS = {
  ok: styles.bOk,
  grey: styles.bGrey,
  blue: styles.bBlue,
  warn: styles.bWarn,
  red: styles.bRed,
} as const;

export type BadgeTone = keyof typeof TONE_CLASS;

/** Small rounded pill used for Hiện / Ẩn and the "Cần xác nhận quy cách" flag. */
export function StatusBadge({ tone, children, title }: { tone: BadgeTone; children: ReactNode; title?: string }) {
  return (
    <span className={`${styles.badge} ${TONE_CLASS[tone]}`} title={title}>
      {children}
    </span>
  );
}

/** Hiện / Ẩn for a visible flag. */
export function VisibleBadge({ visible }: { visible: boolean }) {
  return <StatusBadge tone={visible ? "ok" : "grey"}>{visible ? "Hiện" : "Ẩn"}</StatusBadge>;
}
