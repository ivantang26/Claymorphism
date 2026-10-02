<script lang="ts">
  // Parent trial sign-up (FR-4). Email, optional child's first name, year group.
  // Works without JavaScript (plain POST); with it, validates inline and posts JSON.
  import { onMount, tick } from "svelte";
  import { parseTrial, hasErrors, YEAR_GROUPS, type Errors, type TrialInput, type Plan } from "~/lib/validation";
  import { FAMILY, FAMILY_TRIAL_DAYS, annualSaving, gbp } from "~/lib/pricing";
  import { icon } from "~/lib/icons";

  let plan = $state<Plan>("annual");
  let source = $state<"site" | "game">("site");
  let email = $state("");
  let childFirstName = $state("");
  let yearGroup = $state("");
  let grownUp = $state(false);
  let errors = $state<Errors<keyof TrialInput>>({});
  let status = $state<"idle" | "sending" | "done" | "failed">("idle");
  let form: HTMLFormElement;
  // Browser validation covers the no-JavaScript case; once hydrated we validate inline instead.
  let enhanced = $state(false);

  onMount(() => {
    enhanced = true;
    const q = new URLSearchParams(location.search);
    if (q.get("plan") === "monthly" || q.get("plan") === "annual") plan = q.get("plan") as Plan;
    if (q.get("from") === "game") source = "game";
  });

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const { data, errors: found } = parseTrial({ email, childFirstName, yearGroup, plan, grownUp, source });
    errors = found;
    if (hasErrors(found)) {
      await tick();
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    status = "sending";
    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
        credentials: "same-origin",
      });
      if (res.status === 422) {
        errors = (await res.json()).errors ?? {};
        status = "idle";
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      status = "done";
      await tick();
      document.getElementById("trial-done")?.focus();
    } catch {
      status = "failed";
    }
  }
</script>

{#if status === "done"}
  <div class="done clay clay--mint" id="trial-done" tabindex="-1" role="status">
    <img src="/art/pip-happy-320.webp" alt="" width="140" height="140" />
    <h2>You're in!</h2>
    <p>
      We've emailed {email ? email : "you"} a link to set up the app. Your {FAMILY_TRIAL_DAYS}-day trial starts when you first sign in.
    </p>
    <p>Nothing is charged during the trial, and we'll remind you 3 days before it ends.</p>
  </div>
{:else}
  <form bind:this={form} class="trial" action="/api/trial" method="post" novalidate={enhanced} onsubmit={submit}>
    <input type="hidden" name="source" value={source} />

    <fieldset class="plain">
      <legend class="legend">Choose a plan for after your trial</legend>
      <div class="choices plans">
        <label class="choice">
          <input type="radio" name="plan" value="annual" bind:group={plan} />
          <span>
            <strong>Annual, {gbp(FAMILY.annual.price)} a year</strong>
            <small>Save {annualSaving()}% on monthly</small>
          </span>
        </label>
        <label class="choice">
          <input type="radio" name="plan" value="monthly" bind:group={plan} />
          <span>
            <strong>Monthly, {gbp(FAMILY.monthly.price)} a month</strong>
            <small>Cancel any time</small>
          </span>
        </label>
      </div>
    </fieldset>

    <div class="field">
      <label for="email">Your email address</label>
      <input
        id="email"
        name="email"
        class="input"
        type="email"
        autocomplete="email"
        inputmode="email"
        required
        bind:value={email}
        aria-invalid={errors.email ? "true" : undefined}
        aria-describedby={errors.email ? "email-error" : undefined}
      />
      {#if errors.email}<p class="error" id="email-error">{@html icon("warning-circle")}{errors.email}</p>{/if}
    </div>

    <div class="field">
      <label for="child">Your child's first name <span class="opt">(optional)</span></label>
      <p class="hint" id="child-hint">Pip uses it to say hello. Leave it blank if you prefer.</p>
      <input
        id="child"
        name="childFirstName"
        class="input"
        type="text"
        autocomplete="off"
        maxlength="30"
        bind:value={childFirstName}
        aria-invalid={errors.childFirstName ? "true" : undefined}
        aria-describedby={errors.childFirstName ? "child-hint child-error" : "child-hint"}
      />
      {#if errors.childFirstName}<p class="error" id="child-error">{@html icon("warning-circle")}{errors.childFirstName}</p>{/if}
    </div>

    <div class="field">
      <label for="year">Their year group</label>
      <select
        id="year"
        name="yearGroup"
        class="input"
        required
        bind:value={yearGroup}
        aria-invalid={errors.yearGroup ? "true" : undefined}
        aria-describedby={errors.yearGroup ? "year-error" : undefined}
      >
        <option value="" disabled selected>Choose a year group</option>
        {#each YEAR_GROUPS as y (y)}<option value={y}>{y}</option>{/each}
      </select>
      {#if errors.yearGroup}<p class="error" id="year-error">{@html icon("warning-circle")}{errors.yearGroup}</p>{/if}
    </div>

    <div class="field">
      <label class="check">
        <input
          type="checkbox"
          name="grownUp"
          required
          bind:checked={grownUp}
          aria-invalid={errors.grownUp ? "true" : undefined}
          aria-describedby={errors.grownUp ? "grownup-error" : undefined}
        />
        <span>I'm a parent or carer, and I'm 18 or over</span>
      </label>
      {#if errors.grownUp}<p class="error" id="grownup-error">{@html icon("warning-circle")}{errors.grownUp}</p>{/if}
    </div>

    {#if status === "failed"}
      <p class="error" role="alert">{@html icon("warning-circle")}Something went wrong on our side. Please try again.</p>
    {/if}

    <button type="submit" class="clay-btn clay-btn--peach clay-btn--block submit" disabled={status === "sending"}>
      {status === "sending" ? "Starting your trial..." : "Start free trial"}
    </button>
    <p class="small">No payment details needed for the trial. We only ask for what's on this page.</p>
  </form>
{/if}

<style>
  .trial {
    display: grid;
  }
  .plans {
    grid-template-columns: 1fr;
  }
  .choice small {
    font-weight: 600;
    font-size: 0.95rem;
  }
  .opt {
    font-weight: 600;
  }
  .submit {
    margin-top: 28px;
  }
  .small {
    margin-top: 12px;
    font-size: 0.95rem;
    text-align: center;
  }
  .trial > .error {
    margin-top: 16px;
  }
  fieldset {
    margin-bottom: 20px !important;
  }
  .done {
    padding: 32px;
    display: grid;
    gap: 10px;
    justify-items: start;
  }
  .done img {
    width: 140px;
  }
  .done h2 {
    font-size: var(--fs-h2);
  }
  @media (min-width: 560px) {
    .plans {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
