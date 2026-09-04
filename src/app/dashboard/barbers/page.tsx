import { prisma } from "@/lib/db/client";
import { BarberEditor } from "@/components/dashboard/barber-editor";

export default async function BarbersAdminPage() {
  const barbers = await prisma.barber.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      specialty: true,
      yearsExperience: true,
      isActive: true,
      _count: {
        select: {
          appointments: {
            where: {
              status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
              startsAt: { gte: new Date() },
            },
          },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <span className="eyebrow">The chairs</span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
        Barbers
      </h1>
      <p className="mt-2 max-w-2xl text-bone-2">
        Who works here. Adding someone puts them on the website and in the
        booking flow straight away.
      </p>
      <p className="mt-2 max-w-2xl text-sm text-bone-3">
        Hiding a barber stops new bookings but keeps their history and any
        appointments already in the diary. Nobody is ever deleted &mdash; that
        would take the record of their work with them.
      </p>

      <div className="mt-8">
        <BarberEditor
          barbers={barbers.map((b) => ({
            id: b.id,
            slug: b.slug,
            name: b.name,
            specialty: b.specialty,
            yearsExperience: b.yearsExperience,
            isActive: b.isActive,
            upcomingCount: b._count.appointments,
          }))}
        />
      </div>
    </div>
  );
}
