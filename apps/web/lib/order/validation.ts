import { isValidPhone } from "./phone";

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export interface QuoteFormValues {
  customerName: string;
  phone: string;
  email: string;
  company: string;
  taxCode: string;
  note: string;
}

export interface CheckoutFormValues {
  customerName: string;
  phone: string;
  address: string;
  note: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function contactErrors(values: { customerName: string; phone: string }, nameMessage: string) {
  const errors: FieldErrors<"customerName" | "phone"> = {};
  if (!values.customerName.trim()) errors.customerName = nameMessage;
  if (!values.phone.trim()) errors.phone = "Vui lòng nhập số điện thoại.";
  else if (!isValidPhone(values.phone)) errors.phone = "Số điện thoại chưa đúng. Ví dụ: 0912 345 678.";
  return errors;
}

/** Client-side checks that mirror the API rules; the API stays the authority. */
export function validateQuoteForm(values: QuoteFormValues): FieldErrors<keyof QuoteFormValues> {
  const errors: FieldErrors<keyof QuoteFormValues> = contactErrors(values, "Vui lòng nhập tên người liên hệ.");
  if (values.email.trim() && !EMAIL.test(values.email.trim())) errors.email = "Email chưa đúng.";
  return errors;
}

export function validateCheckoutForm(values: CheckoutFormValues): FieldErrors<keyof CheckoutFormValues> {
  const errors: FieldErrors<keyof CheckoutFormValues> = contactErrors(values, "Vui lòng nhập họ tên.");
  if (!values.address.trim()) errors.address = "Vui lòng nhập địa chỉ nhận hàng.";
  return errors;
}

/** Empty strings become undefined so optional fields are left out of the request body. */
export function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
