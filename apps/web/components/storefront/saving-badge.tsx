import type { PublicSku } from "@/lib/api/types";
import { formatPct } from "@/lib/format/money";

/** "Tiết kiệm 1,9%" / "Bằng giá mua lẻ" / nothing; never "0%". */
export function savingText(saving: PublicSku["saving"]): string | null {
  if (saving.kind === "PERCENT" && saving.pct !== null)
    return `Tiết kiệm ${formatPct(saving.pct)}`;
  if (saving.kind === "EQUAL") return "Bằng giá mua lẻ";
  return null;
}

export function SavingBadge({ saving }: { saving: PublicSku["saving"] }) {
  const text = savingText(saving);
  return text ? <span className="save">{text}</span> : null;
}
