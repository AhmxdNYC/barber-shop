import { recentClients } from "@/lib/dashboard/queries";
import { formatPrice } from "@/lib/shop";

/**
 * The client list.
 *
 * Everyone here exists because they booked, not because they signed up —
 * that is the point of identifying clients by email rather than by account.
 * Notes are barber-only and never leave this side of the app.
 */
export default async function ClientsPage() {
  const clients = await recentClients();

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <span className="eyebrow">The book</span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
        Clients
      </h1>
      <p className="mt-2 max-w-2xl text-bone-2">
        Everyone who has ever booked, whether or not they made an account.
      </p>

      {clients.length === 0 ? (
        <p className="mt-8 rounded-[3px] border border-line bg-surface p-8 text-center text-bone-2">
          No clients yet. They appear here after their first booking.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-[3px] border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-surface-2 text-left text-[0.65rem] uppercase tracking-[0.12em] text-bone-3">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 text-right">Visits</th>
                <th className="px-4 py-3 text-right">No-shows</th>
                <th className="px-4 py-3 text-right">Spent</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-line align-top">
                  <td className="px-4 py-3 font-semibold">{c.name ?? "—"}</td>
                  <td className="px-4 py-3 text-bone-2">
                    <span className="block">{c.email}</span>
                    {c.phone && <span className="block text-bone-3">{c.phone}</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.visitCount}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${c.noShowCount > 0 ? "text-accent" : "text-bone-3"}`}>
                    {c.noShowCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatPrice(c.totalSpentCents)}
                  </td>
                  <td className="max-w-[18rem] px-4 py-3 text-bone-2">
                    {c.notes ?? <span className="text-bone-3">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
