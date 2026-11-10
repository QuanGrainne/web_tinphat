"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { rememberOrder } from "@/lib/order/last-order";
import { isOrderCode, normalizeOrderCode } from "@/lib/order/order-code";
import { isValidPhone } from "@/lib/order/phone";
import { TextField } from "./form-field";

interface LookupFormProps {
  initialCode?: string;
  /** Called with the normalised code once the phone is stored. Default: open /don-hang/{code}. */
  onDone?: (code: string) => void;
  idPrefix?: string;
}

/** Order code + phone. The phone is kept for this tab only so the order page can look the order up. */
export function LookupForm({
  initialCode = "",
  onDone,
  idPrefix = "lookup",
}: LookupFormProps) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ code?: string; phone?: string }>({});

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeOrderCode(code);
    const found: { code?: string; phone?: string } = {};
    if (!isOrderCode(normalized))
      found.code = "Mã đơn gồm DNA và 6 ký tự, ví dụ DNA7K2M9Q.";
    if (!phone.trim()) found.phone = "Vui lòng nhập số điện thoại.";
    else if (!isValidPhone(phone))
      found.phone = "Số điện thoại chưa đúng. Ví dụ: 0912 345 678.";
    setErrors(found);
    if (found.code || found.phone) {
      document
        .getElementById(`${idPrefix}-${found.code ? "code" : "phone"}`)
        ?.focus();
      return;
    }
    rememberOrder(normalized, phone);
    if (onDone) onDone(normalized);
    else router.push(`/don-hang/${normalized}`);
  }

  return (
    <div className="box">
      <h2>Tra cứu đơn</h2>
      <form className="f" onSubmit={onSubmit} noValidate>
        <TextField
          id={`${idPrefix}-code`}
          label="Mã đơn"
          className="mono"
          placeholder="DNA7K2M9Q"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          value={code}
          error={errors.code}
          onChange={(e) => setCode(e.target.value)}
        />
        <TextField
          id={`${idPrefix}-phone`}
          label="Số điện thoại"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={20}
          value={phone}
          error={errors.phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button className="btn btn-pri btn-block" type="submit">
          Tra cứu
        </button>
      </form>
    </div>
  );
}
