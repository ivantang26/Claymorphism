<script lang="ts">
  // Pricing (FR-7): family monthly or annual, schools free up to 30 pupils then per pupil.
  import { FAMILY, FAMILY_TRIAL_DAYS, SCHOOL_FREE_PUPILS, SCHOOL_PER_PUPIL, annualSaving, annualAsMonthly, schoolCost, gbp } from "~/lib/pricing";
  import { icon } from "~/lib/icons";

  let billing = $state<"annual" | "monthly">("annual");
  let pupils = $state<number | null>(210);

  const cost = $derived(schoolCost(pupils ?? 0));
  const perPupil = $derived(pupils && pupils > 0 ? cost / pupils : 0);

  const familyPerks = [
    "All four worlds, Years 1 to 6",
    "Up to 4 children",
    "Weekly progress email",
    "Screen-time controls",
    "Works offline on tablets",
  ];
  const schoolPerks = [
    "Class dashboards and homework setting",
    "Curriculum mapping for Years 1 to 6",
    "Pupil logins without email addresses",
    "Data processing agreement and DPIA template",
  ];
</script>

<div class="plans">
  <section class="clay clay--surface plan" aria-labelledby="fam-title">
    <h2 id="fam-title">Families</h2>
    <div class="toggle clay-well" role="radiogroup" aria-label="Billing">
      <label class:on={billing === "annual"}>
        <input type="radio" name="billing" value="annual" bind:group={billing} />
        Annual <span class="save">save {annualSaving()}%</span>
      </label>
      <label class:on={billing === "monthly"}>
        <input type="radio" name="billing" value="monthly" bind:group={billing} />
        Monthly
      </label>
    </div>
    <p class="price" aria-live="polite">
      {#if billing === "annual"}
        {gbp(FAMILY.annual.price)}<span> a year</span>
      {:else}
        {gbp(FAMILY.monthly.price)}<span> a month</span>
      {/if}
    </p>
    <p class="sub">
      {billing === "annual" ? `That's ${gbp(annualAsMonthly())} a month, billed once a year.` : "Billed monthly. Cancel any time."}
    </p>
    <ul class="perks" role="list">
      {#each familyPerks as p (p)}<li>{@html icon("check-circle")}{p}</li>{/each}
    </ul>
    <a class="clay-btn clay-btn--peach clay-btn--block" href={`/signup?plan=${billing}`}>Start free trial</a>
    <p class="fine">{FAMILY_TRIAL_DAYS} days free. No payment details needed to start.</p>
  </section>

  <section class="clay clay--lemon plan" aria-labelledby="sch-title">
    <h2 id="sch-title">Schools</h2>
    <p class="price">Free<span> for {SCHOOL_FREE_PUPILS} pupils</span></p>
    <p class="sub">Then {gbp(SCHOOL_PER_PUPIL)} per pupil per year. The first {SCHOOL_FREE_PUPILS} are always free.</p>

    <div class="calc">
      <label for="calc-pupils">How many pupils?</label>
      <input id="calc-pupils" class="input" type="number" min="1" max="5000" inputmode="numeric" bind:value={pupils} aria-describedby="calc-out" />
      <p id="calc-out" class="calc-out" aria-live="polite">
        {#if !pupils || pupils < 1}
          Enter a number of pupils.
        {:else if cost === 0}
          <strong>Free</strong> for {pupils} {pupils === 1 ? "pupil" : "pupils"}.
        {:else}
          <strong>{gbp(cost)} a year</strong> for {pupils} pupils, about {gbp(perPupil)} each.
        {/if}
      </p>
    </div>

    <ul class="perks" role="list">
      {#each schoolPerks as p (p)}<li>{@html icon("check-circle")}{p}</li>{/each}
    </ul>
    <a class="clay-btn clay-btn--cream clay-btn--block" href="/schools#book">Book a school demo</a>
  </section>
</div>

<style>
  .plans {
    display: grid;
    gap: 24px;
  }
  @media (min-width: 900px) {
    .plans {
      grid-template-columns: 1fr 1fr;
      align-items: start;
    }
  }
  .plan {
    padding: 28px;
    display: grid;
    gap: 14px;
  }
  @media (min-width: 768px) {
    .plan {
      padding: 40px;
    }
  }
  h2 {
    font-size: 2rem;
  }
  .toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 6px;
  }
  .toggle label {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    border-radius: var(--r-pill);
    font-weight: 800;
    cursor: pointer;
  }
  .toggle input {
    position: absolute;
    inset: 0;
    opacity: 0;
    margin: 0;
    cursor: pointer;
  }
  .toggle label.on {
    background: var(--clay-lemon);
    color: var(--ink);
    box-shadow:
      0 4px 8px rgb(45 42 62 / 0.16),
      inset -3px -3px 6px rgb(0 0 0 / 0.08),
      inset 3px 3px 6px rgb(255 255 255 / 0.7);
  }
  .toggle label:has(input:focus-visible) {
    outline: 4px solid var(--focus);
    outline-offset: 2px;
  }
  .save {
    font-size: 0.85rem;
    padding: 2px 8px;
    border-radius: var(--r-pill);
    background: var(--clay-mint);
    color: var(--ink);
  }
  .price {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(2.6rem, 2rem + 2.4vw, 3.6rem);
    line-height: 1;
    margin-top: 6px;
  }
  .price span {
    font-size: 1.15rem;
    font-weight: 700;
  }
  .sub {
    margin: 0;
  }
  .perks {
    list-style: none;
    margin: 6px 0 10px;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .perks li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-weight: 700;
  }
  .perks :global(svg) {
    width: 22px;
    height: 22px;
    flex: none;
    margin-top: 2px;
  }
  .fine {
    font-size: 0.95rem;
    text-align: center;
    margin: 0;
  }
  .calc {
    display: grid;
    gap: 8px;
    padding: 18px;
    border-radius: var(--r-inner);
    background: rgb(255 255 255 / 0.5);
  }
  .calc label {
    font-weight: 800;
  }
  .calc-out {
    margin: 0;
    font-size: 1.05rem;
  }
</style>
