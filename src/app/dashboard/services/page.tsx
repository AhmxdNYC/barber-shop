import { prisma } from "@/lib/db/client";
import { ServiceEditor } from "@/components/dashboard/service-editor";

export default async function ServicesAdminPage() {
  const services = await prisma.service.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      durationMinutes: true,
      isActive: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <span className="eyebrow">The menu</span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
        Services &amp; prices
      </h1>
      <p className="mt-2 max-w-2xl text-bone-2">
        Changes appear on the website straight away. Appointments already
        booked keep the price they were quoted.
      </p>
      <p className="mt-2 max-w-2xl text-sm text-bone-3">
        Minutes decide how much of the day a booking takes, so a cut set to 30
        minutes will be offered every half hour. Unticking{" "}
        <span className="text-bone-2">Bookable</span> hides a service without
        losing its history.
      </p>

      <div className="mt-8">
        <ServiceEditor services={services} />
      </div>
    </div>
  );
}
