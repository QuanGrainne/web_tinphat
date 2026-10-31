import type { InputHTMLAttributes, Ref, TextareaHTMLAttributes } from "react";

interface BaseProps {
  id: string;
  label: string;
  error?: string;
}

type InputProps = BaseProps & { multiline?: false; required?: boolean } & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;
type AreaProps = BaseProps & { multiline: true; required?: boolean } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">;

/** Label + input (or textarea) + inline error, wired with aria-invalid and aria-describedby. */
export function TextField(props: InputProps | AreaProps) {
  const { id, label, error, required, multiline, className, ...rest } = props;
  const errorId = `${id}-error`;
  const shared = {
    id,
    className: `in${className ? ` ${className}` : ""}`,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
    "aria-required": required ? true : undefined,
  } as const;
  return (
    <div className="fl">
      <label htmlFor={id}>
        {label}
        {required ? <i aria-hidden="true"> *</i> : null}
      </label>
      {multiline ? (
        <textarea {...shared} {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input {...shared} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {error ? (
        <small id={errorId} className="fe" role="alert">
          {error}
        </small>
      ) : null}
    </div>
  );
}

/** Hidden trap for bots. Real visitors never see or fill it; the API rejects a non-empty value. */
export function Honeypot({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="hp" aria-hidden="true">
      <label htmlFor="hp-website">Website</label>
      <input
        id="hp-website"
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export type AlertTone = "err" | "warn" | "info" | "ok";

/** Status box. Errors are announced immediately, everything else politely. */
export function Alert({
  tone,
  title,
  children,
  ref,
}: {
  tone: AlertTone;
  title?: string;
  children?: React.ReactNode;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={ref} tabIndex={-1} className={`alert alert-${tone}`} role={tone === "err" ? "alert" : "status"}>
      {title ? <b>{title}</b> : null}
      {children}
    </div>
  );
}
