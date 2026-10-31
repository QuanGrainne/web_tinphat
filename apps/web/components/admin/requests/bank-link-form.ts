const ORDER_CODE = /DNA[0-9A-Z]{6}/g;

/**
 * Order codes spotted in a bank transfer text, used only to pre-fill the order search. The server matcher stays
 * the authority; this just uppercases, drops spaces/hyphens/dots/underscores and reads `DNA` + 6 characters.
 */
export function guessOrderCodes(content: string): string[] {
  const stripped = content
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "D")
    .toUpperCase()
    .replace(/[\s\-._]/g, "");
  return [...new Set(stripped.match(ORDER_CODE) ?? [])];
}

export interface LinkNoteInput {
  markPaid: boolean;
  txAmount: number;
  orderTotal: number | null;
}

/** Marking an order paid with an amount different from its total needs a note. */
export function isLinkAmountMismatch({ markPaid, txAmount, orderTotal }: LinkNoteInput): boolean {
  return markPaid && orderTotal !== null && txAmount !== orderTotal;
}
