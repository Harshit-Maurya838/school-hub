"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { IconMorph } from "./icon-morph";
import { Input, type InputProps } from "./input";
import { TextMorph } from "./text-morph";
import {
  EASE_OUT,
  INTERACTION_FOCUS,
  INTERACTION_PRESS,
  useInteractionReducedMotion,
} from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * PASSWORD INPUT: show, measure, warn
 *
 *   show     the eye turns into eye-off (rotate morph) and the
 *            dots become letters; focus stays in the field
 *   measure  with `strength`, four segments fill left to right
 *            as the score climbs and the word morphs
 *            (Weak → Fair → Good → Strong)
 *   warn     Caps Lock on while typing folds a note in under it
 * ───────────────────────────────────────────────────────── */

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordInputProps extends Omit<InputProps, "type" | "trailing" | "clearable"> {
  /** Show the four-segment meter. Pass a function to score it yourself (e.g. zxcvbn). */
  strength?: boolean | ((value: string) => PasswordScore);
  /** Words for scores 1 to 4. */
  strengthLabels?: [string, string, string, string];
  /** Whether the password shows as text, controlled or not. */
  shown?: boolean;
  defaultShown?: boolean;
  onShownChange?: (shown: boolean) => void;
}

/** A plain score: length and variety. Swap in zxcvbn for real checks. */
export function scorePassword(value: string): PasswordScore {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
  return Math.max(1, Math.min(4, score)) as PasswordScore;
}

const TONES = ["bg-red-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-500"];
const TEXT = [
  "text-red-600 dark:text-red-400",
  "text-amber-600 dark:text-amber-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-emerald-600 dark:text-emerald-400",
];

export function PasswordInput({
  strength,
  strengthLabels = ["Weak", "Fair", "Good", "Strong"],
  hint,
  value,
  defaultValue,
  onValueChange,
  onKeyDown,
  onKeyUp,
  onBlur,
  size = "md",
  shown: shownProp,
  defaultShown = false,
  onShownChange,
  ...props
}: PasswordInputProps) {
  const reduced = useInteractionReducedMotion();
  const [ownShown, setOwnShown] = React.useState(defaultShown);
  const shown = shownProp ?? ownShown;
  const [text, setText] = React.useState(String(defaultValue ?? ""));
  const [caps, setCaps] = React.useState(false);
  const current = value !== undefined ? String(value) : text;
  const score: PasswordScore =
    !strength || !current
      ? 0
      : typeof strength === "function"
        ? strength(current)
        : scorePassword(current);
  const readCaps = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCaps(e.getModifierState?.("CapsLock") ?? false);

  return (
    <div className="flex w-full flex-col">
      <Input
        {...props}
        size={size}
        type={shown ? "text" : "password"}
        autoComplete={props.autoComplete ?? "current-password"}
        value={value}
        defaultValue={defaultValue}
        hint={caps ? "Caps Lock is on" : hint}
        onValueChange={(v) => {
          if (value === undefined) setText(v);
          onValueChange?.(v);
        }}
        onKeyDown={(e) => {
          readCaps(e);
          onKeyDown?.(e);
        }}
        onKeyUp={(e) => {
          readCaps(e);
          onKeyUp?.(e);
        }}
        onBlur={(e) => {
          setCaps(false);
          onBlur?.(e);
        }}
        trailing={
          <button
            type="button"
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            // Keep focus (and the caret) in the field.
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              if (shownProp === undefined) setOwnShown(!shown);
              onShownChange?.(!shown);
            }}
            className={`text-muted-foreground hover:bg-accent hover:text-foreground flex cursor-pointer items-center justify-center rounded-full ${size === "sm" ? "size-5" : "size-7"} ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
          >
            <IconMorph size={14} mode="rotate" active={shown} from={<Eye />} to={<EyeOff />} />
          </button>
        }
      />
      {strength && (
        <div className="flex items-center gap-3 px-3 pt-2" aria-live="polite">
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className="bg-muted relative h-1 flex-1 overflow-hidden rounded-full"
              >
                <span
                  className={`absolute inset-0 origin-left rounded-full ${TONES[Math.max(0, score - 1)]}`}
                  style={{
                    transform: score >= step ? "scaleX(1)" : "scaleX(0)",
                    transition: reduced
                      ? "none"
                      : `transform 420ms ${EASE_OUT} ${score >= step ? (step - 1) * 50 : 0}ms, background-color 300ms`,
                  }}
                />
              </span>
            ))}
          </div>
          <span
            className={`w-12 text-right text-[12px] font-medium ${score ? TEXT[score - 1] : "text-muted-foreground"}`}
          >
            <TextMorph>{score ? strengthLabels[score - 1] : " "}</TextMorph>
          </span>
        </div>
      )}
    </div>
  );
}

export default PasswordInput;
