"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { useState } from "react";

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
        <p role="alert" className="rounded-[3px] border border-accent bg-accent-dim px-4 py-3 text-sm text-bone">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
