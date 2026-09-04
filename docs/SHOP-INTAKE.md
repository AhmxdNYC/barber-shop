# What to collect at the shop

Everything here is a one-file change afterwards (`src/lib/shop.ts`), except
photos. Ordered by how much it improves the site.

## 1. The other three barbers  ← biggest win

For each of the other chairs:

- [ ] Name (and what clients actually call them)
- [ ] What they're known for — fades, beards, scissor work, kids
- [ ] Roughly how long they've been cutting
- [ ] Photo (see §4)

Right now those three chairs show as "Second / Third / Fourth Chair" with a
**Placeholder** badge. Honest, but it's the emptiest part of the site.

## 2. Prices

- [ ] Confirm or correct every price on `/services`

I set the base haircut to **$40** to match his public listing. Everything else
is my guess and almost certainly wrong somewhere. The full list to check:
Haircut · Taper Fade · Skin Fade · Haircut & Beard · Buzz Cut · Crew Cut ·
Undercut · Pompadour · Beard Trim · Line Up · Hot Towel Shave · Kids Cut ·
Senior Cut · Hair Design.

- [ ] Anything on the list he **doesn't** do — delete it
- [ ] Anything he does that's **missing** — add it

## 3. Hours

- [ ] **Sunday closing time** — genuinely unknown. Every listing shows the
      10:30am open and no close. Currently guessed at 5pm.
- [ ] Confirm the rest: Mon–Fri 10:30am–7:30pm, Sat 10am–7:30pm
- [ ] Any day he closes early, or regular days off?

## 4. Photos

- [ ] One portrait per barber — chest up, standing at their chair
- [ ] 8+ photos of actual cuts for the gallery
- [ ] One or two of the shop interior

Shoot portrait orientation, and get the barber to stand still. Phone camera is
completely fine. Drop them in `public/barbers/<slug>.jpg` and the placeholders
disappear.

## 5. Contact

- [ ] Instagram handle — the footer link is hidden until we have it
- [ ] Does he want an email address shown at all?
- [ ] Confirm the phone: **(914) 476-5347**
- [ ] Confirm the address: **57 Park Hill Avenue, Yonkers, NY 10701**

## 6. The questions that decide what gets built next

These matter more than the content. Ask them casually.

- [ ] **Does he actually want online booking?** He runs on phone calls now.
      Phone lets him hear the job and say "come at 4 instead" — software takes
      that away. If phone works fine for him, the dashboard is wasted effort
      and this stays a website.
- [ ] **Who answers the phone while he's cutting?** If the answer is "nobody,
      it rings out," that's the real problem to solve.
- [ ] **Do people no-show?** Deposits only make sense if they do. If not,
      they're friction with no payoff — drop them.
- [ ] **Would he open an app during the day?** Honest answer, not a polite one.
      A calendar nobody opens is worse than no calendar.
- [ ] **Does he know there's a Fresha page for his shop?** There's a listing at
      `fresha.com/lvp/eduardo-barber-shop-park-hill-avenue-yonkers-wr8LbX`
      with his name and possibly wrong hours. If he never signed up, it's an
      auto-generated listing he can claim or have removed. Most owners want to
      know.

## Also worth showing him

- The site works on his phone — hand it to him rather than describing it
- `/book` completes end to end, but the banner says it's a demo and saves
  nothing. Don't let him think it's live.
