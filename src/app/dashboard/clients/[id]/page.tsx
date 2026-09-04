import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { clientDetail } from "@/lib/dashboard/clients";
import { agoInWords, cadenceInWords } from "@/lib/dashboard/format-relative";
import { formatPrice } from "@/lib/shop";
import { StatTile } from "@/components/dashboard/stat-tile";
import { ClientNote } from "@/components/dashboard/client-note";

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Done",
  CONFIRMED: "Booked",
  PENDING_PAYMENT: "Unpaid hold",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, settings] = await Promise.all([
    clientDetail(id),
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
  ]);
  if (!client) notFound();

  const timeZone = settings?.timezone ?? "America/New_York";
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone, weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "numeric", minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/dashboard/clients" className="text-sm text-bone-3 hover:text-bone">
        &larr; All clients
      </Link>

      <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">
        {client.name ?? client.email}
      </h1>
      <p className="mt-1 text-bone-2">{client.email}</p>

      {client.phone && (
        <a
          href={`tel:${client.phone.replace(/\D/g, "")}`}
          className="mt-4 inline-block rounded-[3px] border border-line-strong px-5 py-2.5 text-sm font-semibold transition-colors hover:border-bone-3"
        >
          Call {client.phone}
        </a>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Visits" value={String(client.visitCount)} />
        <StatTile label="Last in" value={agoInWords(client.daysSinceLastVisit)} />
        <StatTile
          label="Comes"
          value={cadenceInWords(client.averageGapDays) ?? "—"}
          hint={client.averageGapDays === null ? "Needs two visits" : undefined}
        />
        <StatTile
          label="No-shows"
          value={String(client.noShowCount)}
          tone={client.noShowCount > 0 ? "warn" : "neutral"}
        />
      </div>

      <p className="mt-3 text-sm text-bone-3">
        {formatPrice(client.totalSpentCents)} spent since{" "}
        {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(client.createdAt)}.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">Your notes</h2>
        <p className="mt-1 text-sm text-bone-3">
          How they like it, what to avoid, anything worth remembering.
        </p>
        <div className="mt-3">
          <ClientNote clientId={client.id} notes={client.notes} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold">Every visit</h2>
        {client.appointments.length === 0 ? (
          <p className="mt-3 rounded-[3px] border border-line bg-surface px-4 py-5 text-sm text-bone-3">
            Nothing booked yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[3px] border border-line">
            {client.appointments.map((a) => (
              <li key={a.id} className="bg-surface px-4 py-3.5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-sm font-semibold tabular-nums">
                    {fmt.format(a.startsAt)}
                  </span>
                  <span className="text-sm text-bone-2">
                    {a.service.name} · {a.barber.name}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] ${
                      a.status === "NO_SHOW"
                        ? "border-danger text-danger"
                        : a.status === "CANCELLED"
                          ? "border-line text-bone-3"
                          : "border-line-strong text-bone-2"
                    }`}
                  >
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                  <span className="ml-auto text-sm tabular-nums text-bone-2">
                    {formatPrice(a.priceCents)}
                  </span>
                </div>
                {a.clientNotes && (
                  <p className="mt-1.5 text-sm text-bone-3">
                    They said: {a.clientNotes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
