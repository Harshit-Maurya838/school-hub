"use client";

import * as React from "react";
import { EASE_OUT, EASE_THROW, useInteractionReducedMotion } from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * CHECKBOX: a tick that draws itself
 *
 *   check    the box fills from its centre (a slight overshoot)
 *            and the tick draws itself along its stroke
 *   uncheck  the tick retracts the way it came, the fill shrinks
 *   mixed    a dash grows from the middle; mixed → checked bends
 *            the dash into the tick
 *   press    the box gives under the finger
 *
 * A real <input type="checkbox"> underneath, so forms, labels,
 * Space and screen readers all work as they always do.
 * ───────────────────────────────────────────────────────── */

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "size" | "checked" | "defaultChecked"
> {
  checked?: boolean | "mixed";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  /** 14px or 16px box. */
  size?: "sm" | "md";
  ref?: React.Ref<HTMLInputElement>;
}

export function Checkbox({
  checked,
  defaultChecked = false,
  onCheckedChange,
  label,
  description,
  size = "md",
  disabled,
  className = "",
  onChange,
  ref,
  id,
  ...props
}: CheckboxProps) {
  const reduced = useInteractionReducedMotion();
  const auto = React.useId();
  const inputId = id ?? auto;
  const inner = React.useRef<HTMLInputElement>(null);
  const [own, setOwn] = React.useState(defaultChecked);
  const state = checked !== undefined ? checked : own;
  const on = state === true;
  const mixed = state === "mixed";

  React.useEffect(() => {
    if (inner.current) inner.current.indeterminate = mixed;
  }, [mixed]);

  const box = size === "sm" ? "size-3.5 rounded-[4px]" : "size-4 rounded-[5px]";
  const t = (ms: number, delay = 0, ease = EASE_OUT) =>
    reduced ? "none" : `${ms}ms ${ease} ${delay}ms`;

  return (
    <label
      htmlFor={inputId}
      className={`group/cb inline-flex items-start gap-2.5 select-none ${disabled ? "cursor-default opacity-50" : "cursor-pointer"} ${className}`}
    >
      <span className={`relative mt-[2px] inline-flex shrink-0 ${box}`}>
        <input
          ref={(el) => {
            inner.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) (ref as React.RefObject<HTMLInputElement | null>).current = el;
          }}
          id={inputId}
          type="checkbox"
          checked={on}
          disabled={disabled}
          aria-checked={mixed ? "mixed" : on}
          onChange={(e) => {
            if (checked === undefined) setOwn(e.target.checked);
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
          className="peer absolute inset-0 m-0 size-full cursor-[inherit] appearance-none rounded-[inherit] outline-none"
          {...props}
        />
        {/* The box: a hairline that the fill grows over. */}
        <span
          aria-hidden="true"
          className={`bg-background pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_22%,var(--border))] transition-[box-shadow,scale] duration-200 group-hover/cb:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_40%,var(--border))] group-active/cb:scale-[0.88] peer-focus-visible:shadow-[inset_0_0_0_1px_var(--ring),0_0_0_3px_color-mix(in_oklab,var(--ring)_20%,transparent)] motion-reduce:group-active/cb:scale-100`}
        >
          <span
            className="bg-primary absolute inset-0 rounded-[inherit]"
            style={{
              transform: on || mixed ? "scale(1)" : "scale(0.4)",
              opacity: on || mixed ? 1 : 0,
              transition: reduced
                ? "none"
                : `transform ${t(320, 0, EASE_THROW)}, opacity ${t(160)}`,
            }}
          />
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="text-primary-foreground absolute inset-0 size-full"
          >
            {/* The tick draws on the way in and retracts on the way out. */}
            <path
              d="M4 8.4 6.8 11 12 5.2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              style={{
                strokeDashoffset: on ? 0 : 1,
                transition: reduced ? "none" : `stroke-dashoffset ${on ? t(300, 90) : t(160)}`,
              }}
            />
            <path
              d="M4.5 8h7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{
                transform: mixed ? "scaleX(1)" : "scaleX(0)",
                transformOrigin: "8px 8px",
                transition: reduced ? "none" : `transform ${t(260, mixed ? 60 : 0)}`,
              }}
            />
          </svg>
        </span>
      </span>
      {(label || description) && (
        <span className="flex min-w-0 flex-col gap-0.5">
          {label && (
            <span className="text-foreground text-[13.5px] leading-5 font-medium">{label}</span>
          )}
          {description && (
            <span className="text-muted-foreground text-[12.5px] leading-snug">{description}</span>
          )}
        </span>
      )}
    </label>
  );
}

export default Checkbox;
