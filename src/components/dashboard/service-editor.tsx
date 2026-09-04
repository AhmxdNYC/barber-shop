"use client";

import { useActionState, useState } from "react";
import {
  saveServiceAction,
  toggleServiceAction,
  type ServiceState,
} from "@/app/actions/services";
import { Button } from "@/components/ui/button";

export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
  isActive: boolean;
};

/**
 * The price menu, edited in place.
 *
 * Each row is its own form so changing one price never requires re-saving
 * the whole menu, and a mistake in one row cannot block the others.
 */
export function ServiceEditor({ services }: { services: ServiceRow[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <div className="overflow-hidden rounded-[3px] border border-line">
        {services.map((service) => (
          <ServiceRowForm key={service.id} service={service} />
        ))}
        {services.length === 0 && (
          <p className="bg-surface p-8 text-center text-bone-2">
            No services yet. Add the first one below.
          </p>
        )}
      </div>

      <div className="mt-4">
        {adding ? (
          <ServiceRowForm onDone={() => setAdding(false)} />
        ) : (
          <Button variant="outline" onClick={() => setAdding(true)}>
            + Add a service
          </Button>
        )}
      </div>
    </div>
  );
}

function ServiceRowForm({
  service,
  onDone,
}: {
  service?: ServiceRow;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<ServiceState, FormData>(
    saveServiceAction,
    {},
  );
  const isNew = !service;

  return (
    <form
      action={action}
      className={`border-line bg-surface px-4 py-3 ${
        isNew ? "rounded-[3px] border" : "border-b last:border-b-0"
      } ${service && !service.isActive ? "opacity-55" : ""}`}
    >
      {service && <input type="hidden" name="id" value={service.id} />}

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[9rem] flex-1">
          <span className={LABEL}>Service</span>
          <input
            name="name"
            defaultValue={service?.name}
            placeholder="Skin Fade"
            required
            className={INPUT}
          />
        </label>

        <label className="w-24">
          <span className={LABEL}>Price</span>
          <div className="flex items-center gap-1">
            <span className="text-bone-3">$</span>
            <input
              name="price"
              type="number"
              step="1"
              min="0"
              defaultValue={service ? service.priceCents / 100 : 40}
              required
              className={`${INPUT} tabular-nums`}
            />
          </div>
        </label>

        <label className="w-28">
          <span className={LABEL}>Minutes</span>
          <input
            name="durationMinutes"
            type="number"
            step="5"
            min="5"
            defaultValue={service?.durationMinutes ?? 30}
            required
            className={`${INPUT} tabular-nums`}
          />
        </label>

        {service && (
          <label className="flex items-center gap-2 pb-2 text-sm text-bone-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={service.isActive}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Bookable
          </label>
        )}

        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-[3px] border border-line-strong px-4 py-2 text-xs font-semibold transition-colors hover:border-bone-3 disabled:opacity-40"
        >
          {pending ? "Saving…" : isNew ? "Add" : "Save"}
        </button>

        {isNew && onDone && (
          <button type="button" onClick={onDone} className="pb-2 text-xs text-bone-3 hover:text-bone">
            Cancel
          </button>
        )}
      </div>

      <label className="mt-2 block">
        <span className={LABEL}>Description</span>
        <input
          name="description"
          defaultValue={service?.description ?? ""}
          placeholder="Shown on the website under the name"
          className={INPUT}
        />
      </label>

      {state.error && <p role="alert" className="mt-2 text-sm text-accent">{state.error}</p>}
      {state.ok && <p className="mt-2 text-sm text-brass">{state.ok}</p>}
    </form>
  );
}

/** Kept for the archive view; services are hidden, never deleted. */
export function ToggleService({ id, isActive }: { id: string; isActive: boolean }) {
  return (
    <form action={toggleServiceAction}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs text-bone-3 hover:text-bone">
        {isActive ? "Hide" : "Show"}
      </button>
    </form>
  );
}

const LABEL = "mb-1 block text-[0.65rem] uppercase tracking-[0.1em] text-bone-3";
const INPUT =
  "w-full rounded-[3px] border border-line bg-surface-2 px-3 py-2 text-sm text-bone focus:border-bone-3 focus:outline-none";
