# Architecture

A Next.js app with its own Postgres database, for a four-chair barbershop in
Yonkers. Clients pick a barber and book; the shop keeps the calendar.

## The shape of it

```
Browser
  │
  ├── Marketing pages          static, rendered at build
  │     / · /barbers · /services · /gallery · /poster
  │
  └── Booking flow             client component, four steps
        │
        └── server action ──▶ availability query ──▶ Prisma ──▶ Postgres
                                      │
                                      └──▶ availability engine   (pure)
```

The important line is the last one. The **engine** decides what is bookable;
the **query layer** only fetches rows and hands them over. That separation is
why daylight saving, buffers and lead times are tested without a database.

## Directory map

```
src/
├── app/
│   ├── (pages)              landing, barbers, services, gallery, book, poster
│   └── actions/booking.ts   server actions — the client's only way in
│
├── components/
│   ├── ui/                  button · text-field · price-row
│   ├── booking/             one file per step + the orchestrator
│   ├── site-header · site-footer · barber-card · shop-map · print-button
│
├── lib/
│   ├── shop/                shop content — the file you edit for real data
│   │     shop · services · hours · barbers · format
│   ├── availability/
│   │     engine.ts          pure slot generation, no I/O
│   │     query.ts           rows → engine inputs
│   ├── booking/
│   │     types.ts           the BookingProvider seam
│   │     providers/         database · mock · hosted
│   │     manage-token.ts    guest capability tokens
│   ├── db/
│   │     client.ts          Prisma on a driver adapter
│   │     errors.ts          isSlotTakenError — the lost-race detector
│   └── qr.ts                poster QR generation
│
└── test/                    global setup, server-only stub

prisma/
├── schema.prisma
├── migrations/
│   ├── init
│   └── no_overlapping_appointments   ← the exclusion constraint
└── seed.ts                  seeds from src/lib/shop
```

## The three seams

**`BookingProvider`** (`src/lib/booking/types.ts`) — the UI never knows which
booking system it is talking to. `database` is our own; `hosted` hands off to
Square or Fresha; `mock` is a clickable demo. Switching is one environment
variable.

**Engine vs query** (`src/lib/availability/`) — described above. The engine
takes plain data and a clock; it has no imports from Prisma and no `new
Date()` of its own.

**Content vs code** (`src/lib/shop/`) — every shop-specific fact lives here
and nowhere else, so making the site real is editing one directory. The seed
reads from it too.

## Data model in one paragraph

A `Barber` owns `WorkingHours` (weekly), `DateOverride` (per-date exceptions),
`RecurringBlock` (lunch) and `TimeOff` (vacation). An `Appointment` joins a
`Barber`, a `Service` and a `Client`, snapshotting price and contact details
so history survives menu changes. `Client` is keyed on email and exists
whether or not the person ever signs in. `Payment`, `Notification` and
`WaitlistEntry` hang off appointments. `ShopSettings` is a single row holding
policy — buffer, lead time, cancellation window — as data rather than
constants.

## Running it

```bash
npm install
npm run db:migrate      # apply migrations
npm run db:seed         # load shop content into the database
npm run dev

npm test                # 37 tests; integration ones need a _test database
npm run verify:qr       # decode the poster QR and check the URL
```

`DATABASE_URL` lives in `.env` (dev) and `.env.test` (tests). The test suite
refuses to run against any database whose name does not end in `_test`.

## Where to read next

- [DECISIONS.md](DECISIONS.md) — why it is built this way, including the
  things that were wrong first
- [GUEST-CANCELLATION.md](GUEST-CANCELLATION.md) — the capability-token design
- [AUTH-DECISION.md](AUTH-DECISION.md) — why clients have no accounts
- [BOOKING-PROVIDERS.md](BOOKING-PROVIDERS.md) — costs of each booking route
- [DEPLOY-VULTR.md](DEPLOY-VULTR.md) — self-hosting runbook
