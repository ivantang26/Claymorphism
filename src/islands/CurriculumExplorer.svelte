<script lang="ts">
  // Curriculum explorer (FR-6): pick a year group, see what each world covers.
  // Tabs follow the ARIA tabs pattern: arrow keys move, Home/End jump.
  import { onMount } from "svelte";
  import { CURRICULUM, YEARS, yearAges, type Year } from "~/data/curriculum";
  import { WORLDS } from "~/data/worlds";

  let year = $state<Year>(1);
  let tabs: HTMLButtonElement[] = [];

  onMount(() => {
    const y = Number(new URLSearchParams(location.search).get("year"));
    if ((YEARS as readonly number[]).includes(y)) year = y as Year;
  });

  function choose(y: Year, focus = false) {
    year = y;
    const url = new URL(location.href);
    url.searchParams.set("year", String(y));
    history.replaceState(null, "", url);
    if (focus) tabs[YEARS.indexOf(y)]?.focus();
  }

  function onKey(e: KeyboardEvent) {
    const i = YEARS.indexOf(year);
    const map: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: YEARS.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    choose(YEARS[(map[e.key] + YEARS.length) % YEARS.length], true);
  }

  const coverage = $derived(CURRICULUM[year]);
</script>

<div class="explorer">
  <div class="tabs clay-well" role="tablist" aria-label="Year group">
    {#each YEARS as y, i (y)}
      <button
        bind:this={tabs[i]}
        type="button"
        role="tab"
        id={`tab-y${y}`}
        aria-selected={year === y}
        aria-controls="year-panel"
        tabindex={year === y ? 0 : -1}
        class="tab"
        onclick={() => choose(y)}
        onkeydown={onKey}
      >
        <span class="y-short">Y{y}</span><span class="y-long">Year {y}</span>
      </button>
    {/each}
  </div>

  <div id="year-panel" role="tabpanel" aria-labelledby={`tab-y${year}`} class="panel">
    <p class="panel-head"><strong>Year {year}</strong> <span>{yearAges(year)}</span></p>
    <ul class="grid" role="list">
      {#each WORLDS as w (w.id)}
        {@const c = coverage[w.id]}
        <li class={`clay clay--${w.colour} world`}>
          <div class="w-top">
            <img src={`/art/${w.mascot}-idle-320.webp`} alt="" width="64" height="64" loading="lazy" />
            <div>
              <h3>{w.topic}</h3>
              <p class="strand">{c.strand}</p>
            </div>
          </div>
          <ul class="topics" role="list">
            {#each c.topics as t (t)}<li>{t}</li>{/each}
          </ul>
        </li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .tabs {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
    padding: 6px;
  }
  .tab {
    min-height: 52px;
    border: 0;
    border-radius: var(--r-pill);
    background: transparent;
    color: var(--text);
    font: 800 1.05rem/1 var(--font-body);
    cursor: pointer;
  }
  .tab[aria-selected="true"] {
    background: var(--clay-lemon);
    color: var(--ink);
    box-shadow:
      0 4px 8px rgb(45 42 62 / 0.16),
      inset -3px -3px 6px rgb(0 0 0 / 0.08),
      inset 3px 3px 6px rgb(255 255 255 / 0.7);
  }
  .y-long {
    display: none;
  }
  @media (min-width: 640px) {
    .y-short {
      display: none;
    }
    .y-long {
      display: inline;
    }
  }
  .panel {
    margin-top: 24px;
  }
  .panel-head {
    display: flex;
    gap: 12px;
    align-items: baseline;
    font-size: 1.2rem;
  }
  .panel-head strong {
    font-family: var(--font-display);
    font-size: 1.6rem;
  }
  .grid {
    list-style: none;
    margin: 16px 0 0;
    padding: 0;
    display: grid;
    gap: 18px;
  }
  @media (min-width: 768px) {
    .grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  .world {
    padding: 22px;
  }
  .w-top {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .w-top img {
    width: 64px;
    height: 64px;
  }
  h3 {
    font-size: 1.4rem;
  }
  .strand {
    font-size: 0.95rem;
    font-weight: 700;
  }
  .topics {
    margin: 14px 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 8px;
  }
  .topics li {
    position: relative;
    padding-left: 26px;
    line-height: 1.45;
  }
  .topics li::before {
    content: "";
    position: absolute;
    left: 2px;
    top: 0.45em;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgb(255 255 255 / 0.75);
    box-shadow: inset -2px -2px 3px rgb(0 0 0 / 0.1);
  }
</style>
