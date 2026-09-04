import type { Metadata } from "next";
import { requireBarber } from "@/lib/auth/current-user";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/** Availability and appointments change constantly; never cache this. */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireBarber();
  return (
    <>
      <DashboardNav name={user.name} />
      {children}
    </>
  );
}
