# Why there are no client accounts

**Decision: guests only. The barber gets a login; clients never do.**

## The friction argument

Booking a haircut is a thirty-second job. Every step between "I want Thursday
at 4" and a confirmed slot loses people. "Check your email for a sign-in
link" — before you can even see the times — is a big step.

And the payoff for the client is small. Barbershop visits are every two to
four weeks. Nobody remembers they have an account with their barber. They
book as a guest anyway, then you are maintaining an auth system that a
minority of people use once.

## Accounts add nothing a guest cannot do

The guest capability link already covers the entire lifecycle: view the
booking, reschedule it, cancel it. There is no client-facing feature waiting
on an account.

The two things accounts would genuinely add are history and one-tap rebook of
the usual. Both are real, neither is worth blocking a first booking on, and
both can arrive later without changing anything already built.

## The insight: identity is email, not an account

The barber-side value — "this client has been in six times and no-showed
twice" — sounds like it needs accounts. It does not.

Every appointment attaches to a `Client`, matched by normalised email. That
row exists whether the person signed up, booked as a guest, or was entered by
the barber over the phone. So the shop gets full history, private notes,
no-show counts and lifetime spend from the very first booking, with nobody
signing up for anything.

`User` is now purely authentication. It exists for the barber. If clients
ever get accounts, a `User` attaches to the `Client` that is already there,
and they instantly see the history they built as a guest. Additive, not a
migration.

## What still needs a login

The barber. He has a dashboard with every client's phone number and private
notes on it — that cannot sit behind an unguessable URL.

That is **one account, seeded by a script**. No signup page, no invite flow,
no password reset, no role management UI. When the other chairs get their own
logins it is a row per barber, not a registration system.

## Cost of being wrong

Low, which is what makes this the right default. If repeat clients start
asking to see their history, adding magic-link sign-in is a contained piece
of work that attaches to the `Client` rows already accumulating. Nothing gets
thrown away.

The reverse is not true: building auth first means every booking pays the
friction now, for a benefit that may never be wanted.

## For the résumé

"I did not build authentication" reads badly. "Client identity is the email
on the booking, so the shop gets a full client history without anyone
signing up, and the auth surface is one seeded barber account instead of a
public registration system" reads like someone who thinks about products.

The capability-token design in docs/GUEST-CANCELLATION.md is also a more
interesting thing to be asked about than having wired up a library.
