# Barber Shop Booking App

Online booking for a one-chair barbershop. Clients book and pay a deposit;
the barber runs his day from a dashboard.

Built as a portfolio project, intended for real use by a working barber.

## Status

Planning. See [PLAN.md](PLAN.md) for the full feature set, data model,
architecture, and build phases.

## Stack

- **Next.js 15** (App Router) · React 19 · TypeScript
- **Prisma 6** over **Neon Postgres**
- **Auth.js v5** — email magic link + Google
- **Stripe Checkout** — deposit at booking, balance paid in shop
- **Resend** + React Email — confirmations and reminders
- **Tailwind CSS v4** + shadcn/ui
- **Vitest** + **Playwright**
- Deployed on **Vercel**

## What makes it more than a CRUD app

- **Concurrency-safe booking.** A Postgres `EXCLUDE USING gist` constraint on
  the appointment time range makes double-booking impossible at the database
  level, rather than relying on a read-then-write check that loses the race.
- **Timezone-correct availability.** Slot generation is a pure function,
  unit-tested against DST boundary days where a shop-local 9:00am is not a
  fixed UTC offset.
- **Idempotent Stripe webhooks.** Processed event ids are recorded, so
  Stripe's redeliveries cannot double-confirm or double-refund.
- **Lazy slot expiry.** Abandoned checkouts release their slot on read rather
  than waiting for a cron job, so correctness never depends on a scheduler.

## Getting started

Not yet scaffolded — phase 0 in [PLAN.md](PLAN.md).

## License

MIT
