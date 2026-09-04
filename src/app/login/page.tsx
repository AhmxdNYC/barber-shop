import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Barber sign in",
  robots: { index: false, follow: false },
};

/** Sessions are long-lived, so this page is usually unnecessary. */
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Already signed in — send him straight to work rather than showing a
  // form he does not need.
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-5 py-24">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Barber sign in
      </h1>
      <p className="mt-2 text-bone-2">
        For the shop only. Clients don&rsquo;t need an account to book.
      </p>
      <LoginForm next={next} />
    </div>
  );
}
