"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";

/**
 * Barber sign-in.
 *
 * Email and password only. There was an "email me a link" option as well,
 * which meant a working mail provider stood between the barber and his own
 * diary — and a sign-in that depends on an inbox arriving is a sign-in that
 * fails at the worst moment. Adding a second device is still a scan from an
 * already-signed-in one, on the settings page.
 *
 * This happens rarely in any case: a session lasts a rolling year.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={action} className="mt-8 grid gap-4">
      {next && <input type="hidden" name="next" value={next} />}

      <TextField
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="username"
        placeholder="you@example.com"
      />

      <TextField
        label="Password"
        name="password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />

      {state.error && (
        <p role="alert" className="rounded-[3px] border border-danger bg-danger-dim px-4 py-3 text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-xs text-bone-3">
        You&rsquo;ll stay signed in on this device for a year.
      </p>
    </form>
  );
}
