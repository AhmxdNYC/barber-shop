"use client";

import { useActionState, useState } from "react";
import { saveClientNoteAction, type NoteState } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";

/**
 * Private notes, editable at last.
 *
 * These never leave the dashboard — client-facing queries do not select
 * them. That separation is what makes the field usable: a barber who is not
 * sure whether "talks a lot, book him last" could ever be seen by the client
 * will simply not write it.
 */
export function ClientNote({
  clientId,
  notes,
}: {
  clientId: string;
  notes: string | null;
}) {
  const [state, action, pending] = useActionState<NoteState, FormData>(
    saveClientNoteAction,
    {},
  );
  const [value, setValue] = useState(notes ?? "");
  const dirty = value !== (notes ?? "");

  return (
    <form action={action}>
      <input type="hidden" name="id" value={clientId} />
      <textarea
        name="notes"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Skin fade #1, tight on the sides. Prefers early mornings."
        className="w-full rounded-[3px] border border-line bg-surface-2 px-3.5 py-3 text-sm text-bone placeholder:text-bone-3 focus:border-bone-3 focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save note"}
        </Button>
        {state.ok && !dirty && <span className="text-sm text-brass">Saved.</span>}
        {state.error && <span role="alert" className="text-sm text-accent">{state.error}</span>}
        <span className="ml-auto text-xs text-bone-3">Only you can see this.</span>
      </div>
    </form>
  );
}
