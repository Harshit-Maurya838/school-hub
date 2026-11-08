"use client";

import * as React from "react";
import {
  EASE_OUT,
  EASE_THROW,
  INTERACTION_FOCUS,
  useInteractionReducedMotion,
} from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * SEGMENTED CONTROL: one of a few, side by side
 *
 *   pick     the thumb is thrown to the new segment with a slight
 *            overshoot while its width eases to the new label
 *   press    the thumb gives a little under the finger
 *   keys     a radiogroup: arrows move and select, Home/End jump;
 *            one tab stop for the whole control
 * ───────────────────────────────────────────────────────── */

export interface SegmentOption {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Required when `label` isn't text (icon-only segments). */
  ariaLabel?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  options: SegmentOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Accessible name of the group. */
  label: string;
  /** 28px, 34px, or 40px tall (matches tactile sliders). */
  size?: "sm" | "md" | "lg";
  /** Stretch to the parent's width with equal segments. */
  block?: boolean;
  className?: string;
  /** Corner radius: "full" (pill, default) or "rounded" (concentric rounded container). */
  radius?: "full" | "rounded";
}

type Mark = { x: number; w: number };

export function SegmentedControl({
  options,
  value,
  defaultValue,
  onValueChange,
  label,
  size = "md",
  block,
  className = "",
  radius = "full",
}: SegmentedControlProps) {
  const reduced = useInteractionReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [own, setOwn] = React.useState(defaultValue ?? options[0]?.value);
  const current = value !== undefined ? value : own;
  const [mark, setMark] = React.useState<Mark | null>(null);
  const [ready, setReady] = React.useState(false);
  const [pressing, setPressing] = React.useState(false);

  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const el = current
        ? root.querySelector<HTMLElement>(`[data-segment="${CSS.escape(current)}"]`)
        : null;
      if (!el) return setMark(null);
      const next = { x: el.offsetLeft, w: el.offsetWidth };
      setMark((p) => (p && p.x === next.x && p.w === next.w ? p : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    root.querySelectorAll("[data-segment]").forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [current, options]);

  React.useEffect(() => {
    if (!mark || ready) return;
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [mark, ready]);

  const pick = (v: string) => {
    if (value === undefined) setOwn(v);
    onValueChange?.(v);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const enabled = options.filter((o) => !o.disabled);
    const index = enabled.findIndex((o) => o.value === current);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % enabled.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (index - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = enabled.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const v = enabled[next].value;
    pick(v);
    rootRef.current?.querySelector<HTMLElement>(`[data-segment="${CSS.escape(v)}"]`)?.focus();
  };

  const isLg = size === "lg";
  const isSm = size === "sm";
  const isPill = radius === "full";

  // Concentric corner radius matching compact slider geometry
  const rootRadius = isPill
    ? "rounded-full"
    : isLg
      ? "rounded-[13px]"
      : isSm
        ? "rounded-[9px]"
        : "rounded-[11px]";
  const itemRadius = isPill
    ? "rounded-full"
    : isLg
      ? "rounded-[9px]"
      : isSm
        ? "rounded-[7px]"
        : "rounded-[9px]";

  // Proportional sizing: "md" is compact 34px, "lg" is 40px, "sm" is 28px
  const rootPadding = isLg ? "p-1" : "p-0.5";
  const rootHeight = isLg ? "h-10" : isSm ? "h-7" : "h-8.5";
  const indicatorInset = isLg ? "top-1 bottom-1" : "top-0.5 bottom-0.5";
  const itemHeightClass = isLg
    ? "h-8 px-3 text-[13px]"
    : isSm
      ? "h-6 px-2 text-[11.5px]"
      : "h-[30px] px-2.5 text-[12px]";

  return (
    <div
      ref={rootRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`relative isolate items-center select-none ${rootHeight} ${rootRadius} ${rootPadding} border border-black/[0.04] bg-[#f4f4f6] dark:border-white/[0.06] dark:bg-zinc-900/50 ${
        block ? "flex w-full" : "inline-flex"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 ${indicatorInset} ${itemRadius} border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.1] dark:bg-zinc-800`}
        style={{
          transform: `translate3d(${mark?.x ?? 0}px, 0, 0) scale(${pressing && !reduced ? 0.97 : 1})`,
          width: mark?.w ?? 0,
          opacity: mark ? 1 : 0,
          transition:
            reduced || !ready
              ? "none"
              : `transform 440ms ${EASE_THROW}, width 400ms ${EASE_OUT}, opacity 200ms ${EASE_OUT}`,
        }}
      />
      {options.map((option) => {
        const on = option.value === current;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={option.ariaLabel}
            data-segment={option.value}
            disabled={option.disabled}
            tabIndex={on ? 0 : -1}
            onClick={() => pick(option.value)}
            onPointerDown={() => on && setPressing(true)}
            onPointerUp={() => setPressing(false)}
            onPointerLeave={() => setPressing(false)}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${itemRadius} cursor-pointer font-medium transition-colors duration-200 disabled:cursor-default disabled:opacity-40 [&_svg]:size-3.5 ${itemHeightClass} ${
              block ? "flex-1" : ""
            } ${on ? "font-semibold text-zinc-950 dark:text-white" : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"} ${INTERACTION_FOCUS}`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
