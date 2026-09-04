# Eduardo Barbershop

Online booking for a four-chair barbershop. Clients pick their barber by name
and face, choose a service, and hold a slot with a deposit.

Built as a portfolio project, intended for real use by a working shop.

## Status

Public site and booking flow are built. Availability is computed from a real
Postgres database: schema, migrations, seed and the availability engine are
done, with 37 tests. Writing bookings and taking deposits is the next piece.

**Start here:**

| Document | What it covers |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the app is put together |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Why — including what was wrong first |
| [PLAN.md](PLAN.md) | Full feature set, data model, build phases, costs |
| [docs/SHOP-INTAKE.md](docs/SHOP-INTAKE.md) | What still needs collecting from the shop |

## Run it

```bash
npm install
cp .env.example .env          # set DATABASE_URL
npm run db:migrate            # apply migrations
npm run db:seed               # load shop content
npm run dev                   # http://localhost:3000
```

```bash
npm test                      # 37 tests
npm run verify:qr             # decode the poster QR, check the URL
```

Integration tests need a database whose name ends in `_test` (see
`.env.test`) — the suite refuses to run against anything else, because it
writes and deletes rows.

## Pages

| Route | What it is |
|---|---|
| `/` | Landing — hero, the four chairs, price menu, hours, location |
| `/barbers` | Barber roster with portraits and specialties |
| `/services` | Full menu with prices and durations |
| `/gallery` | Cut gallery (placeholder tiles until real photos) |
| `/book` | Four-step booking: barber → service → time → details |
| `/login` | Barber sign-in (not linked from the public site) |
| `/dashboard` | Barber-only: the day, stats, clients |
| `/poster` | Print-ready scan-to-book QR poster for the shop (unlinked) |

`/book` accepts `?barber=<slug>&service=<slug>` and skips straight to time
selection, so every card on the site deep-links into a pre-filled booking.

## The QR poster

`/poster` renders a scan-to-book poster the shop can print and put in the
window. It forces black-on-white in print styles, because the site's dark
theme both drains a cartridge and produces a QR code that scans badly.

The code is generated locally at build time — no QR web service — and the
URL it encodes comes from `NEXT_PUBLIC_SITE_URL`.

```bash
npm run verify:qr    # decodes the generated code and checks the URL
```

A printed QR code can never be corrected. Set the final URL before printing,
and scan a test copy first.

## Swapping in real content

All shop-specific content is in one file, [`src/lib/shop.ts`](src/lib/shop.ts):
name, address, hours, the service menu, and the barber roster. Prices and
barbers other than Eduardo are placeholders. Real photographs replace the
generated SVGs at `public/barbers/<slug>.svg`.

## Making booking real

The flow talks to a `BookingProvider` interface, not a database. Today that
resolves to a mock. Switching to Square, Booksy, Fresha or our own backend
means filling in one adapter and setting an env var — the UI never changes.

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
