<script lang="ts">
  // School demo booking (FR-5): school name, role, pupil count, preferred time.
  // Slots come from our own /api/slots, so no third-party booking widget loads.
  import { onMount, tick } from "svelte";
  import { parseDemo, hasErrors, ROLES, type DemoInput, type Errors } from "~/lib/validation";
  import { schoolCost, gbp, SCHOOL_FREE_PUPILS } from "~/lib/pricing";
  import { demoInvite } from "~/lib/ics";
  import { icon } from "~/lib/icons";
  import type { Day } from "~/lib/booking";

  let name = $state("");
  let email = $state("");
  let school = $state("");
  let role = $state("");
  let pupils = $state<number | null>(null);
  let slot = $state("");
  let dayIndex = $state(0);
  let days = $state<Day[]>([]);
  let load = $state<"loading" | "ready" | "failed">("loading");
  let errors = $state<Errors<keyof DemoInput>>({});
  let status = $state<"idle" | "sending" | "done" | "failed">("idle");
  let booked = $state<{ id: string; slot: string; minutes: number } | null>(null);
  let icsUrl = $state("");
  let form: HTMLFormElement;

  const day = $derived(days[dayIndex]);
  const pupilCount = $derived(pupils ?? NaN);
  const estimate = $derived(Number.isFinite(pupilCount) && pupilCount > 0 ? schoolCost(pupilCount) : null);

  const fmtDay = (iso: string, style: "short" | "long" = "short") =>
    new Intl.DateTimeFormat("en-GB", style === "short" ? { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" } : { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
  const fmtTime = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
  };

  async function fetchSlots() {
    load = "loading";
    try {
      const res = await fetch("/api/slots", { credentials: "same-origin" });
      if (!res.ok) throw new Error(String(res.status));
      days = (await res.json()).days;
      const first = days.findIndex((d) => d.slots.length);
      dayIndex = first === -1 ? 0 : first;
      load = "ready";
    } catch {
      load = "failed";
    }
  }

  onMount(() => {
    void fetchSlots();
    return () => icsUrl && URL.revokeObjectURL(icsUrl);
  });

  function pickDay(i: number) {
    dayIndex = i;
    if (!slot.startsWith(days[i].date)) slot = "";
  }

  function onDayKeys(e: KeyboardEvent, i: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + days.length) % days.length;
    pickDay(next);
    (e.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const { data, errors: found } = parseDemo({ name, email, school, role, pupils, slot });
    errors = found;
    if (hasErrors(found)) {
      await tick();
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    status = "sending";
    try {
      const res = await fetch("/api/demo-booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
        credentials: "same-origin",
      });
      const body = await res.json();
      if (res.status === 422 || res.status === 409) {
        errors = body.errors ?? {};
        status = "idle";
        if (res.status === 409) {
          slot = "";
          void fetchSlots();
        }
        await tick();
        form.querySelector<HTMLElement>('[aria-invalid="true"], [data-slot-error]')?.focus();
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      booked = body;
      const ics = demoInvite({ id: body.id, start: body.slot, minutes: body.minutes, school: data.school });
      icsUrl = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
      status = "done";
      await tick();
      document.getElementById("demo-done")?.focus();
    } catch {
      status = "failed";
    }
  }
</script>

{#if status === "done" && booked}
  {@const [d, t] = booked.slot.split("T")}
  <div class="done clay clay--mint" id="demo-done" tabindex="-1" role="status">
    <img src="/art/lulu-happy-320.webp" alt="" width="130" height="130" />
    <h3>You're booked in</h3>
    <p class="when">{fmtDay(d, "long")} at {fmtTime(t)}, UK time</p>
    <p>
      We'll email the video link to {email} the day before. Your reference is <strong>{booked.id}</strong>.
    </p>
    <a class="clay-btn clay-btn--cream" href={icsUrl} download={`doodle-math-demo-${booked.id}.ics`}>
      {@html icon("download-simple")} Add to calendar
    </a>
  </div>
{:else}
  <form bind:this={form} class="book" novalidate onsubmit={submit}>
    <div class="grid2">
      <div class="field">
        <label for="d-name">Your name</label>
        <input id="d-name" class="input" autocomplete="name" bind:value={name} aria-invalid={errors.name ? "true" : undefined} aria-describedby={errors.name ? "d-name-e" : undefined} />
        {#if errors.name}<p class="error" id="d-name-e">{@html icon("warning-circle")}{errors.name}</p>{/if}
      </div>
      <div class="field">
        <label for="d-email">School email</label>
        <input id="d-email" class="input" type="email" autocomplete="email" inputmode="email" bind:value={email} aria-invalid={errors.email ? "true" : undefined} aria-describedby={errors.email ? "d-email-e" : undefined} />
        {#if errors.email}<p class="error" id="d-email-e">{@html icon("warning-circle")}{errors.email}</p>{/if}
      </div>
    </div>

    <div class="field">
      <label for="d-school">School name</label>
      <input id="d-school" class="input" autocomplete="organization" bind:value={school} aria-invalid={errors.school ? "true" : undefined} aria-describedby={errors.school ? "d-school-e" : undefined} />
      {#if errors.school}<p class="error" id="d-school-e">{@html icon("warning-circle")}{errors.school}</p>{/if}
    </div>

    <div class="grid2">
      <div class="field">
        <label for="d-role">Your role</label>
        <select id="d-role" class="input" bind:value={role} aria-invalid={errors.role ? "true" : undefined} aria-describedby={errors.role ? "d-role-e" : undefined}>
          <option value="" disabled selected>Choose your role</option>
          {#each ROLES as r (r)}<option value={r}>{r}</option>{/each}
        </select>
        {#if errors.role}<p class="error" id="d-role-e">{@html icon("warning-circle")}{errors.role}</p>{/if}
      </div>
      <div class="field">
        <label for="d-pupils">Number of pupils</label>
        <input id="d-pupils" class="input" type="number" inputmode="numeric" min="1" max="5000" bind:value={pupils} aria-invalid={errors.pupils ? "true" : undefined} aria-describedby={errors.pupils ? "d-pupils-e d-est" : "d-est"} />
        <p class="hint" id="d-est" aria-live="polite">
          {#if estimate === null}
            The first {SCHOOL_FREE_PUPILS} pupils are free.
          {:else if estimate === 0}
            That's free: up to {SCHOOL_FREE_PUPILS} pupils cost nothing.
          {:else}
            Estimated cost: <strong>{gbp(estimate, 2)} a year</strong>
          {/if}
        </p>
        {#if errors.pupils}<p class="error" id="d-pupils-e">{@html icon("warning-circle")}{errors.pupils}</p>{/if}
      </div>
    </div>

    <fieldset class="plain when-set">
      <legend class="legend">Pick a time for a 30 minute video call <span class="tz">(UK time)</span></legend>

      {#if load === "loading"}
        <div class="skeleton" aria-busy="true" aria-label="Loading available times">
          <div class="sk-row">{#each Array.from({ length: 5 }) as _, i (i)}<span class="sk sk-day"></span>{/each}</div>
          <div class="sk-grid">{#each Array.from({ length: 6 }) as _, i (i)}<span class="sk sk-slot"></span>{/each}</div>
        </div>
      {:else if load === "failed"}
        <div class="load-error">
          <p class="error">{@html icon("warning-circle")}We couldn't load the calendar.</p>
          <button type="button" class="clay-chip retry" onclick={fetchSlots}>Try again</button>
          <p class="hint">Or email us to arrange a time.</p>
        </div>
      {:else}
        <div class="days" role="group" aria-label="Day">
          {#each days as d, i (d.date)}
            <button
              type="button"
              class="clay-chip day"
              class:on={i === dayIndex}
              aria-pressed={i === dayIndex}
              tabindex={i === dayIndex ? 0 : -1}
              onclick={() => pickDay(i)}
              onkeydown={(e) => onDayKeys(e, i)}
            >
              {fmtDay(d.date)}
              {#if !d.slots.length}<span class="sr-only">, fully booked</span>{/if}
            </button>
          {/each}
        </div>

        {#if day && day.slots.length}
          <div class="choices slots">
            {#each day.slots as s (s.start)}
              <label class="choice">
                <input type="radio" name="slot" value={s.start} bind:group={slot} aria-invalid={errors.slot ? "true" : undefined} />
                <span>{fmtTime(s.start.split("T")[1])}</span>
              </label>
            {/each}
          </div>
        {:else if day}
          <p class="empty">{fmtDay(day.date, "long")} is fully booked. Try another day.</p>
        {/if}
      {/if}
      {#if errors.slot}<p class="error" data-slot-error tabindex="-1">{@html icon("warning-circle")}{errors.slot}</p>{/if}
    </fieldset>

    {#if status === "failed"}
      <p class="error" role="alert">{@html icon("warning-circle")}Something went wrong on our side. Please try again.</p>
    {/if}

    <button type="submit" class="clay-btn clay-btn--lilac clay-btn--block submit" disabled={status === "sending"}>
      {@html icon("calendar-blank")}
      {status === "sending" ? "Booking..." : "Book a school demo"}
    </button>
  </form>
{/if}

<style>
  .book {
    display: grid;
  }
  .grid2 {
    display: grid;
    gap: 20px;
  }
  .grid2 + .field,
  .field + .grid2,
  .grid2 + .grid2 {
    margin-top: 20px;
  }
  .grid2 .field + .field {
    margin-top: 0;
  }
  @media (min-width: 640px) {
    .grid2 {
      grid-template-columns: 1fr 1fr;
    }
  }
  .when-set {
    margin-top: 24px;
  }
  .tz {
    font-weight: 600;
  }
  .days {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding: 6px 4px 12px;
    scroll-snap-type: x proximity;
  }
  .day {
    flex: none;
    cursor: pointer;
    scroll-snap-align: start;
  }
  .day.on {
    --clay: var(--clay-lemon);
    outline: 3px solid var(--ink);
    outline-offset: -3px;
  }
  .slots {
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    margin-top: 6px;
  }
  .slots .choice > span {
    text-align: center;
    font-size: 1.05rem;
  }
  .empty {
    padding: 18px;
    border-radius: 18px;
    background: rgb(var(--page-shadow-rgb) / 0.06);
    font-weight: 700;
  }
  .skeleton {
    display: grid;
    gap: 14px;
  }
  .sk-row {
    display: flex;
    gap: 10px;
    overflow: hidden;
  }
  .sk-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 10px;
  }
  .sk {
    display: block;
    border-radius: var(--r-pill);
    background: rgb(var(--page-shadow-rgb) / 0.08);
  }
  .sk-day {
    width: 110px;
    height: 44px;
    flex: none;
  }
  .sk-slot {
    height: 56px;
    border-radius: 18px;
  }
  @media (prefers-reduced-motion: no-preference) {
    .sk {
      animation: pulse 1.2s ease-in-out infinite alternate;
    }
  }
  @keyframes pulse {
    to {
      opacity: 0.45;
    }
  }
  .load-error {
    display: grid;
    gap: 10px;
    justify-items: start;
  }
  .retry {
    cursor: pointer;
  }
  .submit {
    margin-top: 28px;
  }
  .done {
    padding: 28px;
    display: grid;
    gap: 10px;
    justify-items: start;
  }
  .done img {
    width: 130px;
  }
  .done h3 {
    font-size: var(--fs-h2);
  }
  .when {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.35rem;
  }
</style>
