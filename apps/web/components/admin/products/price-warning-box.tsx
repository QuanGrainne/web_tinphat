import { WarningOutlined } from "@ant-design/icons";
import { formatVnd } from "@/lib/format/money";
import type { PriceMismatchWarning } from "@/lib/admin/pricing-display";
import styles from "./products.module.css";

/** Yellow box under the SKU table: live mismatch warnings, or the server's own messages when the threshold is unknown. */
export function PriceWarningBox({
  warnings,
  serverMessages,
  thresholdPct,
}: {
  warnings: PriceMismatchWarning[];
  serverMessages: string[];
  thresholdPct: number | undefined;
}) {
  if (warnings.length === 0 && serverMessages.length === 0) return null;
  return (
    <div className={styles.warnBox} role="alert">
      <WarningOutlined style={{ marginTop: 3 }} />
      <div>
        <ul>
          {warnings.map((w) => (
            <li key={`${w.index}-${w.unitName}`}>
              <span className={styles.warnBoxTitle}>{w.message}</span> ({formatVnd(w.expectedPrice)})
            </li>
          ))}
          {serverMessages.map((m, i) => (
            <li key={`server-${i}`}>
              <span className={styles.warnBoxTitle}>{m}</span>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 4 }}>
          Kiểm tra trước khi Lưu.
          {thresholdPct !== undefined && ` Ngưỡng cảnh báo: lệch quá ${String(thresholdPct).replace(".", ",")}% (đặt ở Cài đặt).`}
        </div>
      </div>
    </div>
  );
}
