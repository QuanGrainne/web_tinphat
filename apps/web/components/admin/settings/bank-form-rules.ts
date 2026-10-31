import type { BankInfo, BankSettingsUpdate } from "@/lib/api/types";

/** Bank identification number: exactly six digits. */
export const BIN_PATTERN = /^\d{6}$/;
/** Receiving account: 4 to 19 letters or digits (the VietQR limit is 19 characters). */
export const ACCOUNT_NO_PATTERN = /^[0-9A-Za-z]{4,19}$/;

export interface BankFormValues extends BankInfo {
  currentPassword: string;
}

export type BankFormField = keyof BankFormValues;

export const BANK_FORM_FIELDS: readonly BankFormField[] = ["bankName", "bin", "accountNo", "accountName", "currentPassword"];

/** "Nguyễn Văn A" -> "NGUYEN VAN A": banks print the account holder in capitals without diacritics. */
export function normalizeAccountName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase();
}

/** Request body: text trimmed, account holder normalised. */
export function toBankUpdate(values: BankFormValues): BankSettingsUpdate {
  return {
    bankName: values.bankName.trim(),
    bin: values.bin.trim(),
    accountNo: values.accountNo.trim(),
    accountName: normalizeAccountName(values.accountName).trim(),
    currentPassword: values.currentPassword,
  };
}

/** True when any bank field differs from what is saved (the password is not part of the comparison). */
export function isBankFormDirty(saved: BankInfo, values: Partial<BankFormValues> | undefined): boolean {
  if (!values) return false;
  const next = toBankUpdate({
    bankName: values.bankName ?? "",
    bin: values.bin ?? "",
    accountNo: values.accountNo ?? "",
    accountName: values.accountName ?? "",
    currentPassword: "",
  });
  return (
    next.bankName !== saved.bankName ||
    next.bin !== saved.bin ||
    next.accountNo !== saved.accountNo ||
    next.accountName !== saved.accountName
  );
}

export function isBankFormField(name: string): name is BankFormField {
  return (BANK_FORM_FIELDS as readonly string[]).includes(name);
}
