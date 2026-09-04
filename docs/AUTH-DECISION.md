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

## Why not one login for everyone, with the barber routed by role

It is the tidier-sounding design: one auth system, sign in, land wherever
your role belongs. It is wrong here for the same reason as above — it makes
every client create an account to book a haircut, which is the friction this
whole decision exists to avoid. Tidiness in the auth layer is not worth
conversion at the booking form.

## Why not a secret URL for the barber

A URL is not a credential. It leaks through browser history, referrer
headers, shared devices and anyone glancing at the screen, and it cannot be
revoked without breaking the bookmark. Obscurity is fine as a convenience
layer and useless as a control.

What the barber actually wanted from that idea — "just let me get to my
thing without a login screen" — is better solved honestly:

- **A rolling thirty-day session**, refreshed on every visit, so he signs in
  about as often as he changes phone.
- **A web app manifest**, so `/dashboard` can be added to his home screen and
  opens full-screen with no address bar. Tapping the icon puts him straight
  on today's schedule.
- **`/login` redirects to `/dashboard`** when he is already signed in, so the
  form never appears unnecessarily.

The result is that he has "his own app" on his phone, while the thing
protecting client phone numbers and private notes is still a real session and
not a guessable path.

## Why the shop's QR code must never sign anyone in

The obvious-sounding shortcut is for the barber to scan the shop's QR and be
signed in. It is the single most dangerous idea in this document.

That code is **printed on the window**. Every client who walks past scans it.
If it carried a credential, the entire street would be signed in as the
barber, with every client's phone number and private notes in front of them.
It leads to the booking page and nothing else, and there is a test asserting
it contains no token and no dashboard path.

What the idea was reaching for — scan something, be signed in — is safe in a
different shape: a **device-link code generated inside an already-signed-in
session**, shown on screen for two minutes, single use. The same pattern as
linking a desktop messaging client. The phone in your hand vouches for the
new one; nothing printed vouches for anybody.

Two properties do the work:

- **It is never printed.** A printed sign-in code is a credential anyone can
  photograph off a wall, and it cannot be revoked.
- **It expires in two minutes and works once.** An emailed link needs fifteen
  because it sits in an inbox waiting to be found. A code on a screen is
  scanned in seconds; longer is just more time for someone to photograph it
  over a shoulder.

## Scanning the shop QR when already signed in

There is a version of "scan the shop code to get in" that is entirely safe,
and it is the one the barber actually wants.

He is already signed in — the session has been on his phone for weeks. He
just does not want to remember a URL. Scanning the window code opens the
site, and from there he needs one tap to reach his dashboard. Nothing is
authenticating him; the session already did that. The QR is navigation.

The obstacle was that the public pages are statically rendered, and the
session cookie is httpOnly so client JavaScript cannot see it. Reading the
real cookie in the layout would make every public page dynamic — slower for
every client, to save one barber a tap.

So a second cookie carries a bare `1` and nothing else: no identity, no
token, no claim. The header reads it and renders a Dashboard link. Forging
it gets someone a link that redirects them to sign in, which is verified by
test. The session stays httpOnly, the pages stay static, and the barber
scans the window and taps once.

The general shape is worth remembering: when the safe thing is blocked by a
constraint, the answer is usually a smaller piece of information that is
harmless to expose, not a relaxation of the thing protecting you.

## Is a username weaker than an email address?

The instinct that "eduardo" is easier to attack than
"eduardo@eduardobarbershop.com" is half right, and the half it gets wrong
matters more.

**An identifier is not a secret.** It is on business cards, in mailto links,
and in every email the shop has ever sent. Treating it as a second password
is security by obscurity, and it fails the moment somebody guesses that the
barber called Eduardo uses "eduardo". A design that depends on the username
being unknown was never protecting anything.

**What protects the account is the number of guesses.** Before this, a
password could be tried as fast as requests could be sent — and that was
true whether the identifier was a name or a full address. Failed attempts
are now counted per identifier and refused after eight in fifteen minutes, a
success clears the count so mistyping a few times does not lock the shop
out, and the daily job clears old rows.

That is the control that was missing, and it is worth far more than the
format of the username.

The bare name is nonetheless restricted to development. It is a convenience
for a laptop, and on a live shop there is no reason to hand over one of the
two things an attacker needs, however little it buys them.

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
