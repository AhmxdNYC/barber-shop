# Decisions

Why this is built the way it is — including the parts that were wrong first,
which are usually the more useful half.

---

## Part 1 — Engineering

### Double-booking is prevented by the database, not the application

**The problem.** Two clients open the same 3:00pm and both tap confirm. The
obvious implementation checks availability, then writes. Between those two
statements the other request also checks, also sees the slot free, and also
writes. Both succeed. Two people arrive for the same chair.

This is not a rare edge case at a barbershop — it is Saturday morning.

**What we do.** A Postgres exclusion constraint:

```sql
EXCLUDE USING gist (
  "barberId" WITH =,
  tstzrange("startsAt", "endsAt") WITH &&
) WHERE (status IN ('PENDING_PAYMENT','CONFIRMED','COMPLETED'))
```

The second insert fails at the database. No amount of application-level
carelessness can produce a double booking.

`"barberId" WITH =` is load-bearing. Without it the constraint is shop-wide,
and the shop could only ever have one barber working at a time. There is a
test for exactly that case, because it is the kind of thing that looks
correct and silently destroys the business.

**Cost.** Prisma cannot express it, so it is a hand-written migration, and
the error it produces must be recognised in application code
(`isSlotTakenError`) and turned into a 409 rather than a 500.

### The availability engine is pure, and that was not free

`generateSlots()` takes working hours, busy intervals, settings and a clock,
and returns slots. No Prisma import, no `new Date()`, no I/O.

This costs a translation layer (`query.ts`) that exists only to reshape rows.
It buys the ability to test daylight saving, buffer collisions, lead times
and booking horizons in milliseconds, with no database and no fixtures.

Given that timezone bugs surface twice a year and months after deploy, that
trade is not close.

### Instants are `timestamptz`, discovered the hard way

The exclusion constraint refused to create:

```
ERROR: functions in index expression must be marked IMMUTABLE
```

Prisma maps `DateTime` to `timestamp without time zone`. Building a
`tstzrange` from those requires a conversion that depends on the session
timezone, so it is not immutable, so it cannot be indexed.

The fix was to annotate every instant column `@db.Timestamptz(3)`. That is
the correct type for this app regardless — the whole point is knowing what
instant a shop-local 10:30am refers to — but it took a constraint failure to
notice. The default was quietly wrong.

### Abandoned checkouts free their slot on read, not on a schedule

An unpaid hold reserves the slot for ten minutes. When someone abandons
Stripe, that slot must reopen.

The obvious answer is a cron job. Vercel's free tier runs cron **once a day**,
so a slot could sit dead for hours.

Instead, the availability query treats `PENDING_PAYMENT` rows whose
`holdExpiresAt` has passed as free. The slot reopens the instant anyone
looks. Correctness never depends on a scheduler; cron is left with only
genuinely daily work.

The constraint still counts expired holds, because `holdExpiresAt > now()`
cannot appear in a constraint predicate. The booking transaction therefore
expires stale holds immediately before inserting.

### Guest tokens are random and hashed, not cuids

The first version used Prisma's `@default(cuid())` for the "manage my
booking" link. A cuid is collision-resistant but embeds a timestamp and a
counter — two issued minutes apart share most of their leading characters.
Fine for a primary key, wrong for something a stranger must not guess from
their own link.

Now: 256 bits of `randomBytes`, with only the SHA-256 stored. A database leak
yields no working cancellation links. A test asserts two sequential tokens
share no prefix, so this cannot quietly regress.

### Cancelling is a POST, never a link

Corporate mail scanners follow every URL in an email. A convenient
`…/cancel?token=abc` gets fetched by a robot and the client arrives to find
their haircut already cancelled.

`GET /booking/<token>` only displays. Cancelling is a POST behind a
confirmation. Full reasoning in [GUEST-CANCELLATION.md](GUEST-CANCELLATION.md).

### Booking sits behind a provider interface

The UI talks to a `BookingProvider`, not to a database. Three implementations
exist: our own, a mock, and a handoff to a hosted system like Square or
Fresha.

This was written before the database existed, so the entire frontend was
built and demoed against a mock. It also means the cheapest possible route —
pointing at a hosted booking page — stays available as an environment
variable rather than a rewrite. See [BOOKING-PROVIDERS.md](BOOKING-PROVIDERS.md).

### Tests got isolation wrong, and it only failed on the second run

The constraint suite began with `TRUNCATE "Barber" CASCADE`. That destroyed
the seed a later suite depended on — so the suite passed, then failed the
next time it ran, which is the worst kind of test failure.

Fixed three ways: integration tests use their own database, a guard refuses
any `DATABASE_URL` not ending in `_test`, and suites clean up only rows they
create. A global setup reseeds once per run so no suite depends on another's
leftovers.

The guard exists because this already cost the development database once.

### The Postgres driver must not be bundled

Every database read failed inside Next with `Postgres.app failed to verify
"trust" authentication`, while the identical connection string worked from
plain Node, from the seed script and under Vitest.

`pg` does native protocol handling and dynamic requires that a bundler
cannot follow, so it is listed in `serverExternalPackages` and loaded
normally at runtime. On a local Postgres.app setup the role also needs a
real password — the adapter cannot complete a passwordless `trust`
handshake from inside Next's server runtime, even though `psql` and plain
`pg` both can.

Production is unaffected: any hosted database uses a password anyway. It is
recorded here because the symptom points at authentication and the cause is
bundling, which costs an hour if you have not seen it before.

### Rescheduling updates the row rather than cancelling and rebooking

The obvious implementation is to cancel the old appointment and create a new
one. That releases the original slot *before* the replacement is secured, so
a client trying to move an appointment can end up with none at all if
someone takes the new time in between.

Updating in place means the exclusion constraint either accepts the move or
rejects it, and a rejection leaves the original booking untouched. It also
keeps the appointment's identity: same row, same manage link, same history
on the client record. There is a test that attempts an invalid move and
asserts the original survives.

### The barber signs in about once a month, without typing a password

Sessions were twelve hours, which meant a password typed on a phone every
single morning. That is precisely the friction that ends with the dashboard
going unopened — and an unopened dashboard is the failure mode this whole
project is shaped around.

Two changes. Sessions last a rolling thirty days, refreshed on every visit,
so a barber who uses it at all never signs in again. And sign-in is a link
emailed to him rather than a password: he taps it once and is in. The
password form stays as a fallback for when email is not configured.

Links are random, stored hashed, single use and expire in fifteen minutes,
for the same reasons as the guest booking links. Single use matters
particularly here: a mail scanner that follows the link must not leave a
working session behind it.

The trade is that a lost phone stays signed in until the cookie expires or
`AUTH_SECRET` is rotated. For a dashboard on a barber's own phone that is
the right balance, and "Sign out" exists for when it is not.

### Emails are plain text, and failing to send never fails a booking

Two decisions, both about not overbuilding.

A barbershop confirmation is five facts and a link. HTML would add rendering
differences across mail clients, spam-filter weight and a build step, for
nothing the reader gains. Plain text also renders correctly in the phone
lock-screen preview, which is where most of these are actually read.

More importantly, sending is wrapped so a delivery failure cannot fail the
booking. The appointment is the thing that matters; the email is a courtesy.
Every attempt writes a `Notification` row whether it succeeded or not, so a
lost message is a visible, retryable record rather than a line in a log —
which matters most for the confirmation, because it carries the only
cancellation link a guest ever receives. There is a test that forces the
transport to fail and asserts the booking still succeeds.

### Prisma 7 moved the connection URL

Prisma 7 no longer accepts `url` in the schema and no longer auto-loads
`.env`. Configuration lives in `prisma.config.ts`, and the runtime connects
through a driver adapter. npm also resolved the CLI to an `8.0.0-rc` against
a `7.10.0` client — a mismatch that would have failed confusingly later, so
both are pinned.

---

## Part 2 — The client's experience

### Barber first, then service

Most booking flows ask for the service first. This one asks *"who's
cutting?"*

People choose a barbershop for a **person**. Someone who has been going to
Eduardo for three years is not shopping for a haircut, they are booking
Eduardo. Asking for the service first makes them answer an irrelevant
question before the one they care about.

It is also more honest: once the barber is known, every time shown is that
chair's real availability. Ask for service first and you either show shop-wide
times you may not honour, or re-ask after the barber is chosen.

### No accounts. At all.

Booking a haircut is a thirty-second job and every step loses people. "Check
your email for a sign-in link" — *before* seeing any times — is a big step
for a payoff most clients never collect. Visits are every few weeks; nobody
remembers an account with their barber.

The insight that made this work: the shop's client history does not need
client logins. Every appointment attaches to a `Client` matched on email,
whether booked online, as a guest, or typed in by the barber. Full history
from the first booking, nobody signing up. See
[AUTH-DECISION.md](AUTH-DECISION.md).

### Steps are an index, not routes

The four steps are `useState`, not four URLs. Going back never refetches and
never loses a choice.

This is a phone-in-a-barbershop app. Signal is bad, people get interrupted
mid-booking. Losing your slot selection because you tapped back is the kind
of small failure that ends in a phone call instead of a booking.

The cost is that the browser back button leaves the flow rather than stepping
within it. Accepted: the in-page step indicator is the affordance, and
completed steps are clickable.

### Every card deep-links into a prefilled booking

`/book?barber=eduardo&service=taper-fade` jumps straight to choosing a time.
Every barber card and every price row links this way, so the path from "I
like the look of that" to "pick a time" is one tap rather than a re-navigation
of choices already made.

### Only genuinely open times are shown

The slot grid never renders a time that cannot be booked. Greying out
unavailable times looks informative but mostly communicates disappointment,
and on a phone it triples the scrolling for no gain.

### The map cannot be scrolled

A live embedded map captures scroll and pans while someone is trying to get
past it — on a phone it can trap you entirely. Nobody needs to pan a map to
learn where a barbershop is; they need to see it and get directions. The
iframe is inert and the whole panel opens Google Maps.

An earlier version also revealed the map's true colours on hover. It
flickered every time the pointer crossed the page and was removed.

### The demo said it was a demo

While the booking flow was mocked, a banner said so and the confirmation
repeated it. A flow that completes convincingly and saves nothing is worse
than an obviously unfinished one, especially when the person being shown it
might tell a client to use it.

---

## Part 3 — The barber's experience

### The real risk is a dashboard he never opens

Eduardo takes bookings by phone. This app does not replace a system — it
introduces one. That is a good problem, but it moves the risk from technical
to behavioural: you can build a perfect calendar and have clients book into a
screen nobody looks at. That failure is much worse than no online booking,
because the client thinks they have an appointment.

Everything below is shaped by that.

### Phone and walk-in bookings are first-class, not an afterthought

`BookingSource` is `ONLINE | WALK_IN | PHONE`, and the barber can create an
appointment with no payment step.

If the software only knows about online bookings, its calendar is wrong the
moment someone walks in — and a wrong calendar gets abandoned within a week.
The dashboard has to be able to represent his actual day, including the parts
that never touch the website.

### The buffer between cuts is his time, not a gap

The cleanup buffer is part of the interval an appointment occupies, not
spacing between offered slots. Two back-to-back bookings therefore cannot
leave him with zero minutes to sweep up and reset.

This is enforced in the engine with a test, because it is invisible until a
barber has a bad Saturday.

### Shop policy is data, not constants

Buffer, lead time, booking horizon, cancellation window and deposit all live
in a `ShopSettings` row. He can decide next month that two hours' notice is
too strict, and that is a form field, not a deploy.

Any of these hardcoded would mean every policy question becomes a developer
request, and a barber will not file a ticket — he will stop using it.

### Private notes are structurally separated

Notes like *"talks a lot, book him last"* live on `Client`, which
client-facing queries never select, and `barberNotes` is distinct from
`clientNotes` on appointments.

Not a nice-to-have. If a barber cannot trust that his notes are private, he
will not write them, and the CRM is worthless.

### No-shows are tracked because that is what the deposit is for

`noShowCount` on the client, a `NO_SHOW` status, and a deposit kept rather
than refunded. Marking a no-show is one action from the day view.

But this is contingent: **if his clients do not no-show, deposits are
friction with no payoff and should be removed.** That question is in
[SHOP-INTAKE.md](SHOP-INTAKE.md) precisely because building the deposit flow
before answering it would be building the wrong thing carefully.

### One seeded account, not a registration system

The barber signs in; there is no signup page, no invite flow, no password
reset, no role management UI. Adding the other three chairs is three rows.

The auth surface of this application is one account. That is a deliberate
security posture, not an unfinished feature.

### Adding time off never cancels existing bookings

Blocking out a window that already contains appointments reports how many
clash and leaves them alone.

Silently cancelling someone's haircut because the barber blocked an
afternoon is a worse failure than showing him the conflict and letting him
decide. He can call them; the software cannot.

### The client list is sorted by who is overdue, not alphabetically

A flat table answers "who are my clients", which is not a question a barber
has. The one he does have is "who haven't I seen in a while" — a regular who
normally comes every three weeks, is now at five, and has nothing booked is
a phone call worth making, and an alphabetical list buries him among
everyone who was in on Tuesday.

So each client carries their rhythm: how often they come, how long it has
been, what they usually get and from whom. "Due a cut" is its own group at
the top, and someone is only in it if they are past their usual gap *and*
have nothing booked.

Two deliberate restraints. A single visit is not a rhythm, so no cadence is
claimed from one. And there is a tolerance before anyone is called overdue,
because a few days late is normal and a page that cries wolf gets ignored.

### Phone is required, email and name too

Every required field loses bookings, so each one has to earn its place. This
shop runs on phone calls: if the barber is forty minutes behind, or has to
move someone, he rings them. A booking he cannot ring about is a booking he
cannot manage — and handing over a number to book a haircut is not something
anyone objects to.

Validation is deliberately loose — seven to fifteen digits, no country
assumption. A stricter pattern rejects real numbers, and the genuine test is
whether the barber can ring it. Errors appear per field and only once a field
has been touched, so the form does not shout at someone halfway through
typing.

### Dragging the calendar blocks time; it does not move appointments

Dragging an empty column proposes a block, and the block is only created
after a confirmation. On a phone a stray touch while scrolling would
otherwise close the shop for an afternoon silently, and the barber would find
out when a client could not book.

Appointments are deliberately *not* draggable. Moving a client's booking with
an accidental swipe is a much worse failure than any convenience it buys, and
moving one already has a safer path: tap it, pick a time, and the client is
emailed. A drag has no natural place to tell them.

### Revenue counts only completed work

Booked revenue would flatter every figure on the page. The first time a
barber notices the total does not match his till he stops trusting the
dashboard entirely, which is worse than never having shown him money.

No-shows and cancellations are reported separately rather than folded in.
"What did I lose" is a real question, and a single net figure answers
neither it nor "what did I take". It is also the number that decides whether
deposits are worth building — if it is near zero, they are friction with no
payoff.

### Placeholder chairs say they are placeholders

Three of four barbers were invented, with names and backstories. Shown to the
shop owner that reads as either sloppiness or as having made up his staff.

They now read "Second Chair" with a **Placeholder** badge. The design still
demonstrates a full roster; nothing on screen claims to be a person who does
not exist.

The general rule: placeholder content should be **obviously** placeholder,
never convincingly wrong.
