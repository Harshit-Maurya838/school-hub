"use client";

import * as React from "react";
import {
  EASE_OUT,
  EASE_THROW,
  INTERACTION_FOCUS,
  INTERACTION_PRESS,
  useInteractionReducedMotion,
} from "./ui-interaction-motion";

/* ─────────────────────────────────────────────────────────
 * ICON MORPH: one icon becoming another
 *
 *   blur     the old icon shrinks into a 3px blur while the new
 *            one pops out of it with a slight overshoot
 *   rotate   a quarter turn that keeps its direction: forward
 *            turns clockwise, back turns the other way
 *   flip     a card turn: the old icon goes edge-on, the new one
 *            comes round from behind
 *   draw     the new icon's strokes draw themselves, one after
 *            another, as the old one blurs away
 *
 * Every change starts from wherever the last one is, so fast
 * toggling never jumps. Two icons (from/to + active) or any
 * number (icons + value). Reduced motion gets a short crossfade.
 * ───────────────────────────────────────────────────────── */

export type IconMorphMode = "blur" | "rotate" | "flip" | "draw" | "scale";

export interface IconMorphProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Shown while `active` is false. */
  from?: React.ReactNode;
  /** Shown while `active` is true. */
  to?: React.ReactNode;
  active?: boolean;
  /** Any number of icons by name; `value` picks one. Order sets the direction of rotate and flip. */
  icons?: Record<string, React.ReactNode>;
  value?: string;
  /** How the icons trade places. "scale" is the old name for "blur". */
  mode?: IconMorphMode;
  /** Box size in px. */
  size?: number;
}

type Pose = { opacity: string; transform: string; filter: string };

const SHOWN: Pose = { opacity: "1", transform: "none", filter: "blur(0px)" };
const STROKES = "path, line, polyline, polygon, circle, rect, ellipse";

function hidden(mode: IconMorphMode, dir: number, leaving: boolean): Pose {
  const side = leaving ? dir : -dir;
  if (mode === "rotate")
    return { opacity: "0", transform: `rotate(${90 * side}deg) scale(0.5)`, filter: "blur(2px)" };
  if (mode === "flip")
    return { opacity: "0", transform: `rotateY(${90 * side}deg)`, filter: "blur(0px)" };
  if (mode === "draw") return { opacity: "0", transform: "scale(0.85)", filter: "blur(3px)" };
  return { opacity: "0", transform: "scale(0.6)", filter: "blur(3px)" };
}

/**
 * Where a layer starts from. Mid-animation, that's wherever it is now (so a fast toggle turns
 * back instead of jumping); at rest, the pose it held before this render flipped its opacity.
 */
function startPose(el: HTMLElement, rest: Pose): Pose {
  if (!el.getAnimations().some((a) => a.playState === "running")) return rest;
  const style = getComputedStyle(el);
  return {
    opacity: style.opacity,
    transform: style.transform,
    filter: style.filter === "none" ? "blur(0px)" : style.filter,
  };
}

function animateLayer(
  el: HTMLElement,
  mode: IconMorphMode,
  dir: number,
  entering: boolean,
  reduced: boolean
) {
  const from = startPose(el, entering ? hidden(mode, dir, false) : SHOWN);
  el.getAnimations().forEach((a) => a.cancel());
  el.querySelectorAll<SVGElement>(STROKES).forEach((s) =>
    s.getAnimations().forEach((a) => a.cancel())
  );

  if (reduced) {
    el.animate([{ opacity: from.opacity }, { opacity: entering ? "1" : "0" }], {
      duration: 160,
      easing: "ease-out",
    });
    return;
  }

  if (!entering) {
    if (mode === "flip")
      el.animate([from, hidden(mode, dir, true)], {
        duration: 170,
        easing: "cubic-bezier(0.5,0,0.75,0)",
      });
    else el.animate([from, hidden(mode, dir, true)], { duration: 200, easing: EASE_OUT });
    return;
  }

  if (mode === "flip") {
    // Waits until the old face is edge-on, then comes round from behind.
    const wait = Number(from.opacity) < 0.02;
    el.animate(
      wait
        ? [
            { ...from, offset: 0 },
            { ...from, offset: 0.34, easing: EASE_OUT },
            { ...SHOWN, offset: 1 },
          ]
        : [from, SHOWN],
      {
        duration: wait ? 500 : 340,
        easing: wait ? "linear" : EASE_OUT,
      }
    );
    return;
  }
  el.animate(
    [
      { opacity: from.opacity, filter: from.filter },
      { opacity: "1", filter: "blur(0px)" },
    ],
    { duration: mode === "draw" ? 180 : 260, easing: EASE_OUT }
  );
  el.animate([{ transform: from.transform }, { transform: "none" }], {
    duration: mode === "rotate" ? 480 : 440,
    easing: EASE_THROW,
  });
  if (mode !== "draw") return;
  el.querySelectorAll<SVGGeometryElement>(STROKES).forEach((stroke, i) => {
    const length = typeof stroke.getTotalLength === "function" ? stroke.getTotalLength() : 0;
    if (!length) return;
    stroke.animate(
      [
        { strokeDasharray: `${length}`, strokeDashoffset: `${length}` },
        { strokeDasharray: `${length}`, strokeDashoffset: "0" },
      ],
      {
        duration: 420,
        delay: 40 + Math.min(i, 5) * 60,
        easing: EASE_OUT,
        fill: "backwards",
      }
    );
  });
}

export function IconMorph({
  from,
  to,
  active = false,
  icons,
  value,
  mode = "blur",
  size = 16,
  className = "",
  style,
  ...props
}: IconMorphProps) {
  const reduced = useInteractionReducedMotion();
  const layers = React.useMemo<[string, React.ReactNode][]>(
    () =>
      icons
        ? Object.entries(icons)
        : [
            ["from", from],
            ["to", to],
          ],
    [icons, from, to]
  );
  const key = icons ? (value ?? layers[0]?.[0]) : active ? "to" : "from";
  const refs = React.useRef(new Map<string, HTMLSpanElement>());
  const shownRef = React.useRef(key);
  const kind: IconMorphMode = mode === "scale" ? "blur" : mode;

  React.useLayoutEffect(() => {
    const prev = shownRef.current;
    if (prev === key) return;
    shownRef.current = key;
    const order = layers.map(([k]) => k);
    const dir = order.indexOf(key) >= order.indexOf(prev) ? 1 : -1;
    const leaving = refs.current.get(prev);
    const entering = refs.current.get(key);
    if (leaving) animateLayer(leaving, kind, dir, false, reduced);
    if (entering) animateLayer(entering, kind, dir, true, reduced);
  }, [key, layers, kind, reduced]);

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        perspective: kind === "flip" ? 240 : undefined,
        ...style,
      }}
      {...props}
    >
      {layers.map(([k, node]) => (
        <span
          key={k}
          ref={(el) => {
            if (el) refs.current.set(k, el);
            else refs.current.delete(k);
          }}
          className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden] [&_svg]:size-full"
          style={{ opacity: k === key ? 1 : 0, willChange: "transform, opacity" }}
        >
          {node}
        </span>
      ))}
    </span>
  );
}

export interface IconMorphButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  from: React.ReactNode;
  to: React.ReactNode;
  active?: boolean;
  defaultActive?: boolean;
  onActiveChange?: (next: boolean) => void;
  mode?: IconMorphMode;
  /** sm 28px, md 36px, lg 40px. */
  size?: "sm" | "md" | "lg";
  variant?: "outline" | "ghost" | "solid";
  /** Accessible name; the pressed state is announced with it. */
  label: string;
}

const BUTTON_SIZES = {
  sm: { box: "size-7", icon: 14 },
  md: { box: "size-9", icon: 16 },
  lg: { box: "size-10", icon: 18 },
};

const BUTTON_TONES = {
  outline: "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-accent",
  ghost: "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
  solid: "bg-primary text-primary-foreground hover:bg-primary/90",
};

export function IconMorphButton({
  from,
  to,
  active: controlled,
  defaultActive = false,
  onActiveChange,
  mode = "blur",
  size = "md",
  variant = "outline",
  label,
  className = "",
  onClick,
  ...props
}: IconMorphButtonProps) {
  const [inner, setInner] = React.useState(defaultActive);
  const active = controlled ?? inner;
  const s = BUTTON_SIZES[size];

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (controlled === undefined) setInner(!active);
        onActiveChange?.(!active);
      }}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full select-none disabled:cursor-default disabled:opacity-45 ${s.box} ${BUTTON_TONES[variant]} ${INTERACTION_PRESS} ${INTERACTION_FOCUS} ${className}`}
      {...props}
    >
      <IconMorph from={from} to={to} active={active} mode={mode} size={s.icon} />
    </button>
  );
}

export default IconMorph;
