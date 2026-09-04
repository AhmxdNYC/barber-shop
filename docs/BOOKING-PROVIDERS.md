# Making the booking page real — and what each route costs

The booking flow is fully built but deliberately not wired to a backend. It
talks to a `BookingProvider` interface (`src/lib/booking/types.ts`), and today
that resolves to a mock. Going live means picking a provider and filling in one
adapter. **The UI does not change.**

> Prices and free-tier limits below change often, and per-staff limits are the
> detail most likely to have moved. Verify on each vendor's pricing page before
> committing — especially the staff caps, since this shop has four chairs.

## The three routes

### 1. Hand off to a hosted system — cheapest and fastest

We keep the site, they own the calendar. Our booking page collects the barber
and service, then hands the client to the vendor's page with those carried
across. Reminders, payments, and no-show handling become their problem.

| Provider | Cost | Staff limit | Notes |
|---|---|---|---|
| Fresha | Free core product | Unlimited | Monetizes via card processing and marketplace fees |
| Setmore | Free tier | ~4 users on free | Fits four chairs exactly, no room to grow |
| Square Appointments | Free tier exists | **Verify** — varies by plan | Free plan's staff cap is the thing to check |
| Booksy | ~$30/mo + per extra staff | Unlimited on paid | Strong in barbering, but the most expensive here |

**To switch on:**

```bash
NEXT_PUBLIC_BOOKING_PROVIDER=hosted
NEXT_PUBLIC_BOOKING_URL=https://<the shop's real booking page>
NEXT_PUBLIC_BOOKING_LABEL=Square
```

Then open `src/lib/booking/hosted.ts` and correct the query-parameter names in
`buildUrl()` to match whatever the vendor actually accepts for staff and
service. That is the only code change.

**Trade-off:** a visible handoff to someone else's branding, and the booking
data lives in their system, not ours. For a resume piece it's also the least
interesting answer — no backend of our own to talk about.

### 2. Build it ourselves — most control, best for the resume

This is what [PLAN.md](../PLAN.md) specifies: Postgres, Prisma, our own
availability engine, Stripe deposits, Resend email. Costs only hosting
(~$0–20/mo, see PLAN.md §13). All the engineering worth discussing in an
interview lives here.

**To switch on:** implement a `selfProvider` against the same interface,
calling our own API routes, and register it in `src/lib/booking/index.ts`.

### 3. Square's API rather than its hosted page

Middle path — Square owns bookings and payments, but we call their API and
render our own slots and form, so the client never leaves our site. More work
than the handoff, less than building the whole thing, and it inherits Square's
free tier.

**To switch on:** add a `squareProvider` implementing `getAvailability` and
`createBooking` against Square's Bookings API, mode `"inline"`.

## Recommendation

Ship on **hosted** so the shop gets something working immediately at no cost,
then build route 2 behind the same interface and flip the env var when it's
ready. Nothing about the site has to be rebuilt to make that move — that is
the entire reason the interface exists.
