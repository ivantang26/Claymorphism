# Doodle Math

Marketing site for a (fictional) maths app for children aged 5 to 11, in a claymorphism style: puffy 3D clay mascots and pastel clay surfaces for the children, with clear structure for the parents and teachers who pay.

## Run it

```bash
npm install
npm run dev          # http://localhost:4321
npm test             # game, gate, forms, pricing and curriculum logic
npm run build        # contrast gate -> astro build -> tracker scan -> page weight budget
npm run preview      # serve the production build (pages + API) on :4322
```

The API routes (sign-up, demo booking, analytics) write to `data/` as JSON files, and `DOODLE_DATA_DIR` changes the location. `/api/metrics` reports the section 10 success metrics. It is open in dev and needs `METRICS_TOKEN` in production.

## Pages

| Route | What it does |
|---|---|
| `/` | Hero with four mascots on floating islands, worlds, how it works, parents, teachers, testimonials, pricing |
| `/play` | Full-screen demo game (Svelte island) |
| `/parents` | Progress email, screen-time controls, how it adapts, safety promise, FAQ |
| `/schools` | Curriculum explorer, class dashboard, licensing and data protection, demo booking |
| `/pricing` | Family monthly/annual toggle, school per-pupil calculator |
| `/safety` | Safety promise, privacy notice for grown-ups, child-friendly version (`#kids`) |
| `/signup` | Trial sign-up (works without JavaScript too) |
| `/components` | The clay component library, live |

## How the spec is met

| Requirement | Where |
|---|---|
| FR-1 demo game: 8 questions, adaptive, touch/mouse/keyboard, stores nothing | `src/lib/game.ts` (pure state machine, tested), `src/islands/DemoGame.svelte`. Easier after two wrong answers in a row, harder after two first-try answers. Keys: digits type an answer, arrows move between buttons. Nothing is written to cookies or storage. |
| FR-2 grown-up gate | `src/lib/gate.ts`, `src/islands/GrownUpGate.svelte`. "Tap the number seventy-three" with the digit swap as a distractor. Every route out of the game goes through it. |
| FR-3 narration, mute always visible | `src/lib/audio.ts` (Howler sprite, lazy-loaded on Play). Muted on load until the child presses Play. |
| FR-4 trial sign-up | `src/islands/TrialForm.svelte`, `src/pages/api/trial.ts`, validation in `src/lib/validation.ts` (the server keeps only allow-listed fields) |
| FR-5 demo booking | `src/islands/DemoBooking.svelte`, `/api/slots`, `/api/demo-booking`, `.ics` invite. `src/lib/booking.ts` is the provider seam (see below). |
| FR-6 curriculum explorer | `src/data/curriculum.ts` (national curriculum in England, Years 1 to 6), `src/islands/CurriculumExplorer.svelte`, deep-linkable with `?year=3` |
| FR-7 pricing | `src/lib/pricing.ts`, the single source for every price on the site |
| FR-8 no third-party trackers | Astro CSP (`astro.config.mjs`) blocks anything not same-origin. `scripts/scan-trackers.mjs` scans the build for third-party resources, tracker domains, cookie writes and storage, then boots the server and checks that no response sets a cookie. Analytics are first-party daily counters (`src/lib/metrics.ts`) with no cookies, IPs or identifiers, and they honour DNT/GPC. |
| 7:1 contrast | `scripts/check-contrast.mjs` reads `src/styles/tokens.css` and checks every text/surface pair in light and dark mode |
| Page weight | `scripts/check-budget.mjs`: home about 190KB of 1.5MB, game about 330KB of 2MB including audio (phone-sized images, gzipped text) |
| Reduced motion | No bobbing, drifting or confetti (a static star appears instead). Buttons still show pressed shadows. |

## Art and audio pipeline

**Mascots and props** are rendered by a small signed-distance-field raymarcher in `scripts/clay/`. It stands in for the Blender step in the spec. Characters are built from smoothly blended primitives (`scenes.mjs`) and lit from the top-left to match the CSS clay shadow. They have a light surface noise so they read as pressed clay, and they output as WebP at two sizes.

```bash
npm run make:art            # everything (about 3 min on 8 cores)
npm run make:art -- pip     # just jobs matching "pip"
```

**Narration** is packed into one Howler sprite by `scripts/make-audio.mjs`: the voice lines plus four synthesised sound effects, which are soft and never harsh. The voice is a placeholder recorded with the Windows speech engine. To use studio recordings, drop WAVs with the same names into `scripts/audio/voice/` and run `node scripts/make-audio.mjs --pack`.

## Decisions worth knowing

- **Idle and celebrate states are CSS on two rendered poses**, not Lottie. The spec allows "Lottie or sprite". CSS keeps the home page far under budget and is trivially switched off for reduced motion.
- **Booking stays first-party.** An embedded Calendly or Cal.com widget would load third-party scripts and cookies, which breaks FR-8. The page only talks to `/api/slots` and `/api/demo-booking`, and a real calendar provider would plug into `BookingProvider` on the server.
- **Schools pricing:** the first 30 pupils are always free, then £2.40 per pupil per year. This avoids a price cliff at pupil 31.
- **Fonts are self-hosted** (Fontsource), because Google Fonts would be a third-party request.

## Open questions from the spec

- Scottish Curriculum for Excellence: not covered. The explorer data shape (`CURRICULUM[year][world]`) can take a second curriculum.
- Voice actors or synthetic voices: the pipeline supports either. The current voice is a placeholder.
