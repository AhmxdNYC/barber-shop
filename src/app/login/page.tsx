import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Barber sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-5 py-24">
      <span className="pole-stripe mb-6" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
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
