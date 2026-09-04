import Link from "next/link";
import { clientBook } from "@/lib/dashboard/clients";
import { agoInWords, cadenceInWords } from "@/lib/dashboard/format-relative";
import { formatPrice } from "@/lib/shop";

/**
 * The client book.
 *
 * Ordered so the useful rows come first: people who are past their usual gap
 * and have nothing booked. A regular who normally comes every three weeks
 * and is now at five is a phone call worth making, and an alphabetical table
 * buries him among everyone who was in last Tuesday.
 */
export default async function ClientsPage() {
  const clients = await clientBook();

  const due = clients.filter((c) => c.isDue);
  const booked = clients.filter((c) => !c.isDue && c.nextAppointmentAt);
  const rest = clients.filter((c) => !c.isDue && !c.nextAppointmentAt);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <span className="eyebrow">The book</span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
        Clients
      </h1>
      <p className="mt-2 max-w-2xl text-bone-2">
        Everyone who has booked, whether or not they made an account.
      </p>

      {clients.length === 0 ? (
        <p className="mt-8 rounded-[3px] border border-line bg-surface p-8 text-center text-bone-2">
          No clients yet. They appear here after their first booking.
        </p>
      ) : (
        <div className="mt-8 grid gap-10">
          <Group
            title="Due a cut"
            hint="Past their usual gap with nothing booked. Worth a message."
            clients={due}
            emptyText="Nobody is overdue."
            highlight
          />
          <Group
            title="Booked in"
            hint="Already have an appointment coming up."
            clients={booked}
            emptyText="Nobody is booked at the moment."
          />
          <Group
            title="Everyone else"
            clients={rest}
            emptyText="No one else yet."
          />
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  hint,
  clients,
  emptyText,
  highlight = false,
}: {
  title: string;
  hint?: string;
  clients: Awaited<ReturnType<typeof clientBook>>;
  emptyText: string;
  highlight?: boolean;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold">
        {title}
        <span className="ml-2 text-sm font-normal text-bone-3">
          {clients.length}
        </span>
      </h2>
      {hint && <p className="mt-1 text-sm text-bone-3">{hint}</p>}

      {clients.length === 0 ? (
        <p className="mt-3 rounded-[3px] border border-line bg-surface px-4 py-5 text-sm text-bone-3">
          {emptyText}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[3px] border border-line">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 bg-surface px-4 py-3.5 transition-colors hover:bg-surface-2"
              >
                <span className="font-semibold">
                  {client.name ?? client.email}
                </span>

                <span className={`text-sm ${highlight ? "text-danger" : "text-bone-2"}`}>
                  {agoInWords(client.daysSinceLastVisit)}
                </span>

                {client.averageGapDays !== null && (
                  <span className="text-sm text-bone-3">
                    usually {cadenceInWords(client.averageGapDays)}
                  </span>
                )}

                {client.usualService && (
                  <span className="text-sm text-bone-3">
                    {client.usualService}
                    {client.usualBarber && ` · ${client.usualBarber}`}
                  </span>
                )}

                {client.nextAppointmentAt && (
                  <span className="text-sm text-brass">
                    booked{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short", day: "numeric",
                    }).format(client.nextAppointmentAt)}
                  </span>
                )}

                {client.noShowCount > 0 && (
                  <span className="text-sm text-danger">
                    {client.noShowCount} no-show
                    {client.noShowCount === 1 ? "" : "s"}
                  </span>
                )}

                <span className="ml-auto text-sm tabular-nums text-bone-2">
                  {client.visitCount} visit{client.visitCount === 1 ? "" : "s"} ·{" "}
                  {formatPrice(client.totalSpentCents)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
