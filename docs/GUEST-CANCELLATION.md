# Cancelling without an account

Most clients will never make an account. Forcing one just to cancel means
they don't cancel — they no-show, which is the exact problem the deposit
exists to solve. So the guest path has to be genuinely easy *and* not be a
hole someone can walk through.

## The design

The confirmation email contains a link:

    https://eduardobarbershop.com/booking/<token>

That link **is** the credential. There is no password, because there is no
account. Everything below follows from taking that seriously.

### 1. The token is random, not a cuid

Prisma's `@default(cuid())` is the obvious choice and it is wrong here. A
cuid is collision-resistant, but it embeds a timestamp and an in-process
counter, so two tokens issued minutes apart share most of their leading
characters. Fine for a primary key. Not fine for something a stranger must
not be able to guess from their own booking's link.

Tokens are 256 bits from `crypto.randomBytes`. There is a test asserting
that two sequentially issued tokens share no prefix, precisely to stop
someone "simplifying" this back to a cuid later.

### 2. Only the hash is stored

The database holds `manageTokenHash` — SHA-256 of the token. The plaintext
exists once, in the email.

If the database leaks, the attacker gets hashes, which cancel nothing. Same
reasoning as password hashing. The cost is that we can never re-send the
original link, because we no longer have it. That is fine: recovery issues a
*new* token and invalidates the old one, which is better behaviour anyway.

### 3. Opening the link is safe; cancelling is not a link

This is the detail that bites people.

Corporate mail scanners, antivirus, and link-preview bots **follow links in
emails**. Outlook Safe Links will happily GET every URL in a message. So a
convenient one-click `…/cancel?token=abc` in an email gets fetched by a
robot, and the client arrives at the shop to find a machine cancelled their
haircut.

Therefore:

- `GET /booking/<token>` only **displays** the appointment. It is safe to
  fetch any number of times.
- Cancelling is a **POST**, from a form on that page, behind an explicit
  confirmation. A scanner following the link cannot trigger it.

Never put a state-changing GET in an email.

### 4. The token opens one appointment, nothing else

It grants exactly: view *this* booking, reschedule it, cancel it. It cannot
list the client's other appointments, cannot see other clients, and does not
expose anything they were not already told in the confirmation email.

### 5. It expires

Valid until the appointment ends, plus seven days. An inbox is a long-lived
and frequently-breached place for a working credential to sit, and there is
no reason a link to a haircut from last March should still function.

### 6. It does not leak through the browser

The manage page sets `Referrer-Policy: no-referrer` and `noindex`. Without
that, clicking "Directions" from the manage page would hand the token to
Google in the `Referer` header, and a crawler that ever saw the URL could
put it in search results.

## Losing the link

Realistically, people delete the email. Without recovery a guest has no way
to cancel at all, which pushes them back to phoning the shop — the problem
online booking exists to solve.

    /booking/lost  →  enter your email  →  we send a fresh link

Rules for that endpoint:

- It replies **the same way whether or not a booking exists**: "If we have a
  booking for that address, we've sent a link." Otherwise it becomes a way
  to test which email addresses are clients of the shop.
- Rate limited per address and per IP, so it cannot be used to spray email.
- Issuing a new token **invalidates the previous one**, because only the
  hash is stored and there is nothing to resend. There is a test asserting
  the old hash stops resolving.

## What is enforced on the server

The UI hides the cancel button outside the cancellation window. That is a
convenience, not a control — the server re-checks all of it:

- Is the token valid, unexpired, and attached to this appointment?
- Is the appointment still cancellable (not already cancelled, completed, or
  in the past)?
- Is it inside the free-cancellation window, and so does the deposit get
  refunded or kept?

`cancelledBy` records that a guest token performed it, so the barber can
tell a client cancellation from one he made himself.

## Why not a code instead of a link

An emailed six-digit code is the other common pattern. It avoids a
long-lived URL, but it costs a round trip and a form, and it is still just
"whoever controls the inbox". The link is materially easier and the security
difference is small once the token is random, hashed, scoped and expiring.

SMS codes would be stronger, since possession of a phone beats access to an
inbox. That is worth revisiting if SMS is switched on for reminders anyway —
the cost is already paid at that point.
