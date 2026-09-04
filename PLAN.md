# Barber Shop Booking App — Build Plan

A production booking app for a real one-chair barbershop, built as a portfolio
piece. Two audiences: **clients** who book online, and **the barber** who runs
his day out of a dashboard.

---

## 1. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Shop scope | **Multi-barber (4 chairs)** | Revised — the shop has four barbers and clients pick by name and photo. |
| Stack | Next.js 16 (App Router) + Prisma + Postgres | One deploy, real server-side logic to talk about. |
| Database | Neon Postgres (serverless, free tier) | Branching DBs, sleeps when idle. |
| Auth | Auth.js v5 — email magic link + Google | No password storage, no reset flow to build. |
| Payments | Stripe Checkout, deposit only | Card at booking, balance paid at the chair. |
| Notifications | Resend email now, Twilio SMS behind a flag | Email is free and instant; SMS needs A2P registration. |
| Hosting | Vercel | Free tier, cron jobs, preview deploys. |

**Revision (2026-09-04).** This started as a single-barber build; the shop is
Eduardo Barbershop and has four chairs, with clients choosing a specific barber
by name and photo. The additive migration anticipated here is now part of the
baseline schema: a `Barber` model, and `barberId` on `Appointment`,
`WorkingHours`, `DateOverride`, `RecurringBlock` and `TimeOff`.

The one change that is easy to get wrong is the double-booking constraint. It
must be scoped per barber, or two barbers can never hold appointments at the
same time:

```sql
ALTER TABLE "Appointment"
  ADD CONSTRAINT no_overlapping_appointments
  EXCLUDE USING gist (
    "barberId" WITH =,                                  -- per chair
    tstzrange("startsAt", "endsAt") WITH &&
  )
  WHERE (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED'));
```

Availability becomes per barber, plus a "first available" mode that unions
every barber's open slots.

---

## 2. Users and roles

**Guest** — browses, books, pays a deposit. Never has to create an account.
Gets a signed management link by email to cancel or reschedule.

**Client** (signed in) — everything a guest can do, plus appointment history,
one-tap rebook of a previous cut, and saved contact details.

**Barber** (exactly one, seeded by hand) — full dashboard. There is no
role-management UI and no invite flow; the account is created by a seed script.

---

## 3. Features

### 3.1 Public site

- **Landing page** — hero, service menu with prices, cut gallery, hours,
  address with map, contact, Instagram link.
- **Booking flow** — service → date → time slot → contact details →
  Stripe deposit → confirmation. Four screens, mobile-first.
- **Live availability** — open slots computed from working hours minus booked
  appointments, minus time off, minus recurring blocks, minus buffer.
- **Manage a booking** — cancel or reschedule from a signed link or the client
  account, subject to the cancellation window.
- **Waitlist** — when a day is full, join it; get emailed the moment a slot on
  that day frees up.

### 3.2 Barber dashboard

- **Today view** — the day's appointments as a timeline, with client name,
  service, and whether the deposit cleared.
- **Calendar** — day and week views. Drag on empty space to block time.
- **Block time** — one-off blocks (vacation, appointment, early close) and
  recurring blocks (lunch every weekday 12–1).
- **Working hours** — weekly template plus per-date overrides for holidays.
- **Services** — name, duration, price, deposit amount, active toggle, ordering.
- **Appointment actions** — complete, mark no-show (deposit kept), cancel
  with refund, add private notes.
- **Manual booking** — book a walk-in or phone client without payment.
- **Clients** — visit history, private notes ("skin fade #1, tight on the
  sides"), no-show count, lifetime spend.
- **Stats** — revenue this week, no-show rate, busiest hours, top services.

### 3.3 Cross-cutting

- Mobile-first throughout — the barber runs this from his phone between cuts.
- All timestamps stored UTC, rendered in the shop timezone.
- Double-booking is impossible at the database level, not just the UI level.
- Cancellation policy is data, not hardcoded: free outside the window,
  deposit forfeited inside it.

---

## 4. Data model

```prisma
enum Role            { CLIENT BARBER }
enum AppointmentStatus { PENDING_PAYMENT CONFIRMED COMPLETED CANCELLED NO_SHOW }
enum BookingSource   { ONLINE WALK_IN PHONE }
enum PaymentStatus   { PENDING SUCCEEDED FAILED REFUNDED PARTIALLY_REFUNDED }
enum NotificationType { BOOKING_CONFIRMED REMINDER_24H CANCELLED RESCHEDULED WAITLIST_OPENING }
enum NotificationStatus { QUEUED SENT FAILED }
enum WaitlistStatus  { ACTIVE NOTIFIED CONVERTED EXPIRED }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  emailVerified DateTime?
  name          String?
  phone         String?
  image         String?
  role          Role     @default(CLIENT)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  appointments  Appointment[]
  profile       ClientProfile?
  accounts      Account[]        // Auth.js
  sessions      Session[]        // Auth.js
}

/// Barber-facing CRM data. Kept off User so client-visible queries
/// never accidentally leak private notes.
model ClientProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  notes           String?  @db.Text
  visitCount      Int      @default(0)
  noShowCount     Int      @default(0)
  totalSpentCents Int      @default(0)
  lastVisitAt     DateTime?
  isBlocked       Boolean  @default(false)
}

/// Singleton row (id = 1). All shop-wide policy lives here so the
/// barber can change rules without a deploy.
model ShopSettings {
  id                      Int     @id @default(1)
  name                    String
  phone                   String
  email                   String
  addressLine1            String
  city                    String
  state                   String
  postalCode              String
  timezone                String  @default("America/New_York")
  slotIntervalMinutes     Int     @default(15)   // granularity of start times
  bufferMinutes           Int     @default(10)   // cleanup between cuts
  minLeadTimeMinutes      Int     @default(120)  // no last-second bookings
  maxAdvanceDays          Int     @default(60)   // booking horizon
  cancellationWindowHours Int     @default(24)   // free-cancel cutoff
  holdMinutes             Int     @default(10)   // how long checkout holds a slot
  instagramUrl            String?
  mapUrl                  String?
}

model Service {
  id              String  @id @default(cuid())
  name            String
  slug            String  @unique
  description     String?
  durationMinutes Int
  priceCents      Int
  depositCents    Int
  imageUrl        String?
  isActive        Boolean @default(true)
  sortOrder       Int     @default(0)

  appointments Appointment[]
  waitlist     WaitlistEntry[]
}

/// Recurring weekly template. One row per weekday.
model WorkingHours {
  id             String  @id @default(cuid())
  dayOfWeek      Int     @unique          // 0 = Sunday
  opensAtMinutes Int                      // 540 = 09:00, shop-local
  closesAtMinutes Int                     // 1200 = 20:00
  isClosed       Boolean @default(false)
}

/// Per-date exception to WorkingHours — holidays, early closes.
model DateOverride {
  id              String   @id @default(cuid())
  date            DateTime @unique @db.Date
  opensAtMinutes  Int?
  closesAtMinutes Int?
  isClosed        Boolean  @default(false)
  reason          String?
}

/// Recurring intra-day block, e.g. lunch every weekday.
model RecurringBlock {
  id              String  @id @default(cuid())
  dayOfWeek       Int
  startAtMinutes  Int
  endAtMinutes    Int
  label           String
  isActive        Boolean @default(true)
}

/// One-off block: vacation, dentist, closing early.
model TimeOff {
  id       String   @id @default(cuid())
  startsAt DateTime                 // UTC
  endsAt   DateTime                 // UTC
  reason   String?
  isAllDay Boolean  @default(false)

  @@index([startsAt, endsAt])
}

model Appointment {
  id        String @id @default(cuid())

  // Signed-in client, or guest details — exactly one is populated.
  clientId   String?
  client     User?   @relation(fields: [clientId], references: [id], onDelete: SetNull)
  guestName  String?
  guestEmail String?
  guestPhone String?

  serviceId String
  service   Service @relation(fields: [serviceId], references: [id], onDelete: Restrict)

  startsAt DateTime                  // UTC
  endsAt   DateTime                  // UTC, = startsAt + duration + buffer

  status AppointmentStatus @default(PENDING_PAYMENT)
  source BookingSource     @default(ONLINE)

  // Price snapshot — service prices change, past appointments must not.
  priceCents   Int
  depositCents Int

  /// While PENDING_PAYMENT, the slot is held until this instant.
  holdExpiresAt DateTime?

  clientNotes String? @db.Text
  barberNotes String? @db.Text

  cancelledAt        DateTime?
  cancelledBy        String?
  cancellationReason String?

  /// Unguessable token for the guest "manage my booking" link.
  manageToken String @unique @default(cuid())

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  payment       Payment?
  notifications Notification[]

  @@index([startsAt])
  @@index([status, startsAt])
}

model Payment {
  id            String @id @default(cuid())
  appointmentId String @unique
  appointment   Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)

  stripeCheckoutSessionId String? @unique
  stripePaymentIntentId   String? @unique
  stripeRefundId          String?

  amountCents   Int
  refundedCents Int           @default(0)
  status        PaymentStatus @default(PENDING)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

/// Stripe redelivers webhooks. Recording processed event ids makes
/// handling idempotent.
model ProcessedWebhookEvent {
  id          String   @id            // Stripe event id
  type        String
  processedAt DateTime @default(now())
}

model WaitlistEntry {
  id         String @id @default(cuid())
  clientId   String?
  guestEmail String?
  guestName  String?
  serviceId  String
  service    Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  desiredDate DateTime @db.Date
  status      WaitlistStatus @default(ACTIVE)
  notifiedAt  DateTime?
  createdAt   DateTime @default(now())

  @@index([desiredDate, status])
}

/// Outbox + audit log. Every send is a row, so failures are visible
/// and retryable instead of vanishing.
model Notification {
  id            String @id @default(cuid())
  appointmentId String?
  appointment   Appointment? @relation(fields: [appointmentId], references: [id], onDelete: Cascade)

  channel           String                                  // EMAIL | SMS
  type              NotificationType
  status            NotificationStatus @default(QUEUED)
  recipient         String
  providerMessageId String?
  error             String?
  sentAt            DateTime?
  createdAt         DateTime @default(now())

  @@index([status, createdAt])
}

model GalleryImage {
  id          String  @id @default(cuid())
  url         String
  caption     String?
  sortOrder   Int     @default(0)
  isPublished Boolean @default(true)
}
```

Auth.js also requires its own `Account`, `Session`, and `VerificationToken`
models — standard, copied from the adapter docs.

---

## 5. The two hard parts

Everything else is CRUD. These two are the engineering worth talking about.

### 5.1 Availability engine

A pure function, no database access, fully unit-testable:

```
availableSlots(date, service, { hours, appointments, timeOff, blocks, settings })

1. Resolve the day's hours: DateOverride ?? WorkingHours[dayOfWeek].
   Closed → return [].
2. Generate candidate starts every `slotIntervalMinutes` from open to
   (close − service.durationMinutes).
3. Collect busy intervals: confirmed and unexpired-pending appointments,
   overlapping time off, and that weekday's recurring blocks.
4. Drop any candidate whose [start, start + duration + buffer) overlaps a
   busy interval.
5. Drop candidates earlier than now + minLeadTimeMinutes.
6. Drop candidates beyond now + maxAdvanceDays.
```

Separating the pure function from the data fetch means the interesting
logic gets tested without a database — including DST boundary days, where a
shop-local 9:00am is not a fixed UTC offset year-round.

### 5.2 Booking concurrency

Two people tapping the same 3:00pm slot at the same moment must not both get
it. A read-then-write check loses that race. Postgres settles it instead —
a raw-SQL migration Prisma cannot express:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
  ADD CONSTRAINT no_overlapping_appointments
  EXCLUDE USING gist (tstzrange("startsAt", "endsAt") WITH &&)
  WHERE (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED'));
```

The second insert fails at the database. The API catches the violation and
returns `409 Conflict`; the UI refreshes the slot list and tells the user that
time was just taken.

---

## 6. Payment and hold flow

```
1. Client picks a slot
     → INSERT Appointment (PENDING_PAYMENT, holdExpiresAt = now + 10 min)
     → exclusion constraint rejects a taken slot → 409, refresh slots

2. Create Stripe Checkout Session (deposit amount, expires_at = hold + slack)
     → redirect to Stripe

3. Webhook checkout.session.completed
     → record event id (skip if already processed)
     → Appointment → CONFIRMED, holdExpiresAt = null
     → Payment → SUCCEEDED
     → queue BOOKING_CONFIRMED email

4. Abandoned checkout
     → the availability query treats PENDING_PAYMENT rows with
       holdExpiresAt < now as free. Expiry is lazy, so the slot reopens
       instantly without waiting on a cron.

5. Daily cron
     → sweep expired holds to CANCELLED (tidiness, not correctness)
     → send REMINDER_24H for tomorrow's appointments
     → expire stale waitlist entries
```

Lazy expiry matters: Vercel's Hobby plan runs cron at most once per day, so
correctness cannot depend on a frequent job. Cron only does the daily work.

**Refunds** — cancel outside the window refunds the deposit via the Stripe
Refunds API. Inside the window, or a no-show, keeps it. That is the whole
point of the deposit.

**Stripe account** — for a single barber, use his own Stripe keys so money
lands directly in his account. Stripe Connect solves multi-party payouts and
is unnecessary here.

---

## 7. Notifications

One `NotificationService` with pluggable channels, so SMS is a config change
rather than a refactor:

```
NotificationService
├── EmailChannel (Resend + React Email)   ← enabled
└── SmsChannel   (Twilio)                 ← behind ENABLE_SMS flag
```

Triggers: booking confirmed, 24h reminder, cancelled, rescheduled, waitlist
opening. Every attempt writes a `Notification` row, so a failed send is a
visible, retryable record instead of a lost message.

---

## 8. Routes

```
app/
├── (public)/
│   ├── page.tsx                     landing
│   ├── services/page.tsx
│   ├── gallery/page.tsx
│   ├── book/
│   │   ├── page.tsx                 pick service
│   │   ├── [serviceSlug]/page.tsx   calendar + slots
│   │   └── details/page.tsx         contact info → Stripe
│   └── booking/[manageToken]/page.tsx   guest manage: cancel / reschedule
├── (client)/
│   └── appointments/
│       ├── page.tsx                 upcoming + history
│       └── [id]/page.tsx
├── (barber)/dashboard/
│   ├── page.tsx                     today + stats
│   ├── calendar/page.tsx
│   ├── appointments/page.tsx
│   ├── availability/page.tsx        hours · time off · closures
│   ├── services/page.tsx
│   ├── clients/[id]/page.tsx
│   └── settings/page.tsx
└── api/
    ├── stripe/webhook/route.ts
    └── cron/daily/route.ts
```

Mutations are server actions; only Stripe webhooks and cron need route
handlers, since those are called by machines rather than the UI.

---

## 9. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16, App Router, React 19, TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| ORM | Prisma 6 |
| Database | Neon Postgres |
| Auth | Auth.js v5 (magic link + Google) |
| Payments | Stripe Checkout + webhooks |
| Email | Resend + React Email |
| Validation | Zod, shared between client and server |
| Forms | react-hook-form |
| Dates | date-fns + date-fns-tz |
| Tests | Vitest (availability engine), Playwright (booking E2E) |
| Deploy | Vercel + Vercel Cron |

---

## 10. Build phases

Each phase ends green and deployed. Deploying in phase 0 means deployment is
never a scary end-of-project event.

| # | Phase | Delivers |
|---|---|---|
| 0 | Scaffold | Next.js + Tailwind + Prisma + Neon connected, deployed to Vercel |
| 1 | Schema | Full Prisma schema, exclusion-constraint migration, seed with his real services and prices |
| 2 | Availability engine | Pure functions + Vitest suite including DST cases. No UI. |
| 3 | Booking flow | Public booking end to end, guest only, no payment yet |
| 4 | Auth | Auth.js, client accounts, appointment history, cancel / reschedule |
| 5 | Payments | Stripe deposits, webhook handling, hold expiry, refunds |
| 6 | Barber dashboard | Calendar, block time, working hours, services, manual booking |
| 7 | Notifications | Resend emails, React Email templates, daily reminder cron |
| 8 | CRM + stats | Client notes, no-show tracking, revenue dashboard |
| 9 | Polish | Landing page design, gallery, SEO/OG, a11y pass, Playwright E2E, README |
| 10 | Go live | Real Stripe keys, real hours, custom domain, walk the barber through it |

Phases 2 and 5 are the ones worth taking slowly. The rest is execution.

---

## 11. Explicitly not building

Scope discipline, so the project finishes:

- Multi-tenant / multi-shop
- Point of sale, inventory, or retail product sales
- Loyalty points or promo codes
- Native mobile apps
- Chat between client and barber
- Payroll or commission splitting

---

## 12. Known risks

- **DST and timezones.** A 9:00am shop-local slot is not a fixed UTC offset.
  Store UTC, compute in shop time, and unit-test the March and November
  boundary weekends specifically.
- **Vercel Hobby cron caps at once per day.** Handled by making slot expiry
  lazy, so nothing time-sensitive depends on a job.
- **Stripe webhook redelivery.** Handled by `ProcessedWebhookEvent`.
- **SMS is not free.** Twilio requires a paid number and US A2P 10DLC
  registration, which takes days. Hence email first, SMS behind a flag.
- **Client PII.** Names, emails, phone numbers, and private notes. Keep
  barber notes off any client-facing query, and support account deletion.

---

## 13. What it costs to run

Two very different answers depending on who is using it. Prices are as of
early 2026 and worth re-checking before committing.

### As a portfolio piece only

| Service | Tier | Cost |
|---|---|---|
| Vercel | Hobby | $0 |
| Neon Postgres | Free (0.5 GB) | $0 |
| Resend | Free (3k emails/mo, 100/day) | $0 |
| Stripe | Test mode | $0 |
| Domain | optional `.com` | ~$12/yr |
| **Total** | | **$0/mo** |

### As a real business the barber depends on

The catch: **Vercel's Hobby plan forbids commercial use.** A barbershop taking
real bookings and real money is commercial, so a live shop needs Vercel Pro.

| Service | Tier | Cost |
|---|---|---|
| Vercel | Pro (commercial use allowed) | $20/mo |
| Neon Postgres | Free tier is genuinely enough at this volume | $0 |
| Resend | Free tier covers ~3k emails/mo | $0 |
| Domain | `.com` | ~$12/yr |
| **Total** | | **~$20/mo + $12/yr** |

### Cheaper hosts that permit commercial use

If $20/mo is too much for one chair:

| Host | Cost | Trade-off |
|---|---|---|
| Railway | ~$5/mo usage-based | No preview deploys, less polished DX |
| Render | $7/mo (free tier sleeps) | Cold starts on free tier are unacceptable for booking |
| Fly.io | ~$3–5/mo | More configuration, you manage the Dockerfile |
| Cloudflare Workers | $5/mo | Needs a Prisma driver adapter; some Node APIs unavailable |

Recommended path: build and demo on Vercel Hobby for free, and move to Vercel
Pro or Railway only when the shop actually goes live.

### Stripe fees (paid by transaction, not monthly)

2.9% + $0.30 per charge. On a $10 deposit that is **$0.59, about 6%** —
proportionally steep because of the flat 30¢.

| Deposit | Fee | Barber nets |
|---|---|---|
| $5 | $0.45 | $4.55 (9%) |
| $10 | $0.59 | $9.41 (6%) |
| $20 | $0.88 | $19.12 (4.4%) |

A $10–15 deposit is the sweet spot: large enough to deter no-shows, small
enough that clients accept it, and the fee stays reasonable. One prevented
no-show pays for a month of fees.

### Adding SMS later

| Item | Cost |
|---|---|
| Twilio phone number | ~$1.15/mo |
| SMS (US) | ~$0.0079 each |
| A2P 10DLC brand registration | ~$4 one-time |
| A2P campaign | ~$2/mo |
| 300 texts/month | ~$2.40 |
| **Total** | **~$6/mo** |

### Bottom line

- Portfolio and demo: **free**.
- Live shop, email only: **~$20/mo**, or ~$5/mo on Railway.
- Live shop with SMS: **~$26/mo**.

Deposits collected will exceed hosting cost after roughly two prevented
no-shows per month.
