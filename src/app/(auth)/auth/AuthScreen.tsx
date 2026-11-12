"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { LogIn, School } from "lucide-react";
import { AuthShell } from "@/components/layout/PublicShell";
import { SegmentedControl } from "@/components/hairline/segmented-control";

export type AuthTab = "login" | "register";

const TAB_OPTIONS = [
  { value: "login", label: "Sign in", icon: <LogIn aria-hidden="true" /> },
  { value: "register", label: "Register school", icon: <School aria-hidden="true" /> },
];

const HEIGHT_MS = 460;

/**
 * Sign in and Register school on one page. Both panels stay mounted so typed values
 * survive a switch; the incoming panel slides in from its side while the sheet's
 * height eases to fit it. The URL follows the tab without a navigation.
 */
export function AuthScreen({
  initialTab,
  login,
  register,
}: {
  initialTab: AuthTab;
  login: React.ReactNode;
  register: React.ReactNode;
}) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [switched, setSwitched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fromHeight = useRef<number | null>(null);

  const switchTo = (next: AuthTab) => {
    if (next === tab) return;
    fromHeight.current = containerRef.current?.offsetHeight ?? null;
    setSwitched(true);
    setTab(next);

    const url = new URL(window.location.href);
    if (next === "register") url.searchParams.set("tab", "register");
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url);
  };

  // Before paint: pin the old height, then ease to the new panel's natural height.
  useLayoutEffect(() => {
    const el = containerRef.current;
    const from = fromHeight.current;
    fromHeight.current = null;
    if (!el || from === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const to = el.offsetHeight;
    if (from === to) return;
    el.style.overflow = "hidden";
    el.style.height = `${from}px`;
    void el.offsetHeight; // commit the start height before transitioning
    el.style.transition = `height ${HEIGHT_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;
    el.style.height = `${to}px`;

    const done = window.setTimeout(() => {
      el.style.removeProperty("height");
      el.style.removeProperty("transition");
      el.style.removeProperty("overflow");
    }, HEIGHT_MS);
    return () => window.clearTimeout(done);
  }, [tab]);

  const panelClass = (side: "left" | "right") =>
    switched ? (side === "left" ? "auth-panel-from-left" : "auth-panel-from-right") : "";

  return (
    <AuthShell
      switcher={
        <SegmentedControl
          label="Sign in or register"
          options={TAB_OPTIONS}
          value={tab}
          onValueChange={(v) => switchTo(v as AuthTab)}
          size="lg"
          block
        />
      }
    >
      <div ref={containerRef}>
        <div hidden={tab !== "login"} className={panelClass("left")}>
          {login}
        </div>
        <div hidden={tab !== "register"} className={panelClass("right")}>
          {register}
        </div>
      </div>
    </AuthShell>
  );
}
