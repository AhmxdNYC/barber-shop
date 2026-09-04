"use client";

import { useActionState, useState } from "react";
import {
  loginAction,
  requestMagicLinkAction,
  type LoginState,
  type MagicLinkState,
} from "@/app/actions/auth";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";

/**
 * Sign-in, link-first.
 *
 * A barber signs in on his own phone and stays signed in for a rolling
 * month, so this happens rarely — and when it does, tapping a link beats
 * typing a password between haircuts. The password form is kept as a
 * fallback for when email is not configured, or when he is on a machine
 * without his inbox.
 */
export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"link" | "password">("link");

  return (
    <div className="mt-8">
      {mode === "link" ? <MagicLink /> : <PasswordForm next={next} />}

      <button
        type="button"
        onClick={() => setMode(mode === "link" ? "password" : "link")}
        className="mt-6 text-sm text-bone-3 underline underline-offset-4 hover:text-bone-2"
      >
        {mode === "link" ? "Use a password instead" : "Email me a link instead"}
      </button>
    </div>
  );
}

function MagicLink() {
  const [state, action, pending] = useActionState<MagicLinkState, FormData>(
    requestMagicLinkAction,
    {},
  );
  const [email, setEmail] = useState("");

  if (state.sent) {
    return (
      <div className="rounded-[3px] border border-line bg-surface p-6">
        <p className="text-bone">Check your email.</p>
        <p className="mt-2 text-sm text-bone-3">
          If that address belongs to a barber here, there&rsquo;s a sign-in
          link waiting. It works once and expires in 15 minutes.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="username"
        placeholder="you@example.com"
      />
      <input type="hidden" name="email" value={email} />

      {state.error && (
        <p role="alert" className="rounded-[3px] border border-accent bg-accent-dim px-4 py-3 text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending || !email}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
      <p className="text-xs text-bone-3">
        No password to remember. You&rsquo;ll stay signed in on this phone for
        a month.
      </p>
    </form>
  );
}

function PasswordForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={action} className="grid gap-4">
      {next && <input type="hidden" name="next" value={next} />}

      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="username"
        placeholder="you@example.com"
      />
      <input type="hidden" name="email" value={email} />

      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      <input type="hidden" name="password" value={password} />

      {state.error && (
        <p role="alert" className="rounded-[3px] border border-accent bg-accent-dim px-4 py-3 text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
