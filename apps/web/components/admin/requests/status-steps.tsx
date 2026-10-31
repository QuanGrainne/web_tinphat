"use client";

import type { StepView } from "@/lib/admin/order-labels";
import s from "./requests.module.css";

const STATE_CLASS = { done: s.stepDone, now: s.stepNow, todo: "" } as const;

/** Dot-and-line progress bar: done steps blue, current step ringed. */
export function StatusSteps({ steps }: { steps: StepView[] }) {
  return (
    <div className={s.stepsWrap}>
      <ol className={s.steps} aria-label="Tiến trình xử lý">
        {steps.map((step) => (
          <li
            key={step.key}
            className={`${s.step} ${STATE_CLASS[step.state]}`}
            aria-current={step.state === "now" ? "step" : undefined}
          >
            {step.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
