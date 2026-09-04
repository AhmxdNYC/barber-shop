# Getting this onto a phone

The goal is a website **and** an app someone can download on iOS. This is
where that stands, what it costs, and why.

## What this project is

Next.js — **React for the web**, not React Native. It renders HTML in a
browser. There is no Xcode project and nothing here can be submitted to
Apple as it stands.

That is worth stating plainly because "React" and "React Native" sound
interchangeable and are not: React Native compiles to real iOS views and
produces no website at all.

## Would React Native have avoided the App Store fee?

No. **The $99/year Apple Developer Program is required to publish any app to
the App Store**, whatever built it — Swift, React Native, Flutter, Unity,
Capacitor. It is a distribution fee, not a technology fee. (Verify the
current figure against Apple's own pricing before budgeting.)

Things that are sometimes mistaken for a free route:

- A **free Apple ID** can install a build onto your own device through
  Xcode, but it **expires after seven days**. That is sideloading for
  development, not distribution.
- **TestFlight** requires the paid programme.

For this project React Native would also have been the *wrong* tool, because
it produces no website — the marketing pages, the booking flow and the QR
landing page would all have had to be built a second time.

## What exists today, at no cost

The site is an installable web app:

- **Add to Home Screen** gives an icon that opens full screen with no
  address bar.
- Since **iOS 16.4**, home-screen web apps can receive **push
  notifications** — so "a booking came in" can reach the barber's lock
  screen without the App Store.
- Works offline once a service worker is added.

| | Web app (free) | App Store ($99/yr) |
|---|---|---|
| Home-screen icon | yes | yes |
| Full screen | yes | yes |
| Push notifications | yes (iOS 16.4+) | yes |
| Offline | yes | yes |
| Findable by App Store search | no | yes |
| Apple review | none | guideline 4.2 risk |

The real difference is discoverability, and nobody searches the App Store
for one barbershop. Eduardo installs it once from a link.

## If the App Store listing is still wanted

**Capacitor** wraps this exact codebase in a native shell, so nothing is
rebuilt. Two things to plan for:

1. **$99/year**, ongoing.
2. **Apple rejects wrapped websites.** Guideline 4.2 (Minimum Functionality)
   means a webview with no native capability gets turned down. Passing it
   needs real native features — push notifications, offline, Sign in with
   Apple. The push work done for the web app is exactly what satisfies this,
   which is another reason to do it first.

## Recommendation

Build the web app out fully — push notifications and offline — because it is
free, it is most of what "an app on his phone" means, and it is a
prerequisite for passing App Store review anyway.

Treat the $99 as buying a *listing*, not a capability. That is a reasonable
thing to want for a portfolio, and it is worth being clear that is the
reason rather than believing the app cannot work without it.

## Who the app is actually for

Clients book a haircut every few weeks; they will not install an app for one
barbershop, and they should not have to — the QR code and the website are
their path. The person who would open an app daily is the barber. If a
native app is built, it should be the dashboard.
