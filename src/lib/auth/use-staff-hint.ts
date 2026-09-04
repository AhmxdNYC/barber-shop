"use client";

import { useSyncExternalStore } from "react";
import { STAFF_HINT_COOKIE } from "./session";

/**
 * Whether this browser looks like a signed-in barber.
 *
 * Reads a cosmetic cookie, not the session — the session is httpOnly and
 * client JavaScript must not see it. This only decides whether to render a
 * "Dashboard" link; the dashboard itself is guarded by middleware and by
 * requireBarber(), so a forged hint gets someone a link and a redirect to
 * sign in.
 *
 * useSyncExternalStore rather than an effect, because the cookie is external
 * state being read into React, and it gives a correct server snapshot so the
 * markup matches on hydration.
 */

function subscribe(onChange: () => void): () => void {
  // Cookies have no change event. Re-checking when the tab regains focus
  // catches the case of signing in or out in another tab.
  window.addEventListener("focus", onChange);
  window.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    window.removeEventListener("visibilitychange", onChange);
  };
}

function readCookie(): boolean {
  return document.cookie
    .split("; ")
    .some((entry) => entry === `${STAFF_HINT_COOKIE}=1`);
}

export function useStaffHint(): boolean {
  return useSyncExternalStore(
    subscribe,
    readCookie,
    // On the server the page is static and no one is signed in yet.
    () => false,
  );
}
