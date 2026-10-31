import type { FormInstance } from "antd";
import { ApiProblem } from "@/lib/admin/api-client";
import { parseFieldPath } from "@/lib/admin/catalogue-form";

export interface ReadableProblem {
  /** Vietnamese `detail` of the problem (or a generic line for non-API failures). */
  message: string;
  /** Per-field messages, so none of them is silent even when the field is not on screen. */
  items: string[];
  code: string | null;
  status: number | null;
}

/** Turns any thrown value into a readable problem and attaches server field errors to the matching form items. */
export function readProblem(error: unknown, form?: FormInstance): ReadableProblem {
  if (!(error instanceof ApiProblem)) {
    return { message: "Có lỗi xảy ra. Vui lòng thử lại.", items: [], code: null, status: null };
  }
  const errors = error.fieldErrors;
  if (form && errors.length > 0) {
    form.setFields(errors.map((e) => ({ name: parseFieldPath(e.field), errors: [e.message] })));
  }
  return { message: error.message, items: errors.map((e) => e.message), code: error.code, status: error.status };
}
