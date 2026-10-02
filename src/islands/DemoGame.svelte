<script lang="ts">
  // Play the demo (FR-1, FR-2, FR-3): Pip asks 8 addition questions.
  // Touch, mouse and keyboard (number keys + arrows). Stores nothing.
  import { onMount, tick } from "svelte";
  import { initialState, reduce, TOTAL_QUESTIONS, questionText, matchTyped, type GameState, type Event } from "~/lib/game";
  import * as audio from "~/lib/audio";
  import type { Clip } from "~/lib/audio";
  import { icon } from "~/lib/icons";
  import { track } from "~/lib/analytics";
  import GrownUpGate from "./GrownUpGate.svelte";

  const rng = Math.random;
  let game = $state<GameState>(initialState(rng));
  let muted = $state(true); // muted on load until the child presses Play
  let mutedByUser = false;
  let announce = $state("");
  let reduced = $state(false);
  let gateTarget = $state<{ href: string; label: string } | null>(null);
  let wobbling = $state<number | null>(null);
  let burst = $state(0);
  let answersEl = $state<HTMLDivElement>();
  let typed = "";
  let typedTimer: ReturnType<typeof setTimeout> | undefined;
  let nextTimer: ReturnType<typeof setTimeout> | undefined;

  const PRAISE: Clip[] = ["praise1", "praise2", "praise3", "praise4"];
  const NUDGE: Clip[] = ["nudge1", "nudge2", "nudge3"];
  const pickClip = (xs: Clip[]) => xs[Math.floor(Math.random() * xs.length)];
  const numberClip = (n: number) => `n${n}` as Clip;
  const questionClips = (): Clip[] => ["what", numberClip(game.question.a), "plus", numberClip(game.question.b)];

  const pipMood = $derived(game.phase === "correct" || game.phase === "done" ? "happy" : "idle");
  const progress = $derived(game.stars / TOTAL_QUESTIONS);

  // Confetti pieces are generated per burst so each celebration looks different.
  const confetti = $derived.by(() => {
    void burst;
    const count = game.phase === "done" ? 26 : 14;
    return Array.from({ length: count }, (_, i) => ({
      id: `${burst}-${i}`,
      x: Math.round((Math.random() - 0.5) * 520),
      y: Math.round(-120 - Math.random() * 260),
      r: Math.round((Math.random() - 0.5) * 540),
      s: (0.5 + Math.random() * 0.7).toFixed(2),
      d: Math.round(Math.random() * 120),
    }));
  });

  onMount(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    reduced = mq.matches;
    const onChange = () => (reduced = mq.matches);
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      clearTimeout(nextTimer);
      clearTimeout(typedTimer);
      audio.stopVoice();
    };
  });

  function send(e: Event) {
    game = reduce(game, e, rng);
  }

  function setMute(value: boolean, byUser = false) {
    muted = value;
    if (byUser) mutedByUser = true;
    audio.setMuted(value);
    if (!value) void audio.load();
  }

  function askAloud(prefix: Clip[] = []) {
    announce = `Question ${game.index + 1} of ${TOTAL_QUESTIONS}. ${questionText(game.question)}`;
    void audio.say([...prefix, ...questionClips()]);
  }

  async function start() {
    if (!mutedByUser) setMute(false);
    send({ type: "start" });
    track("game_start");
    askAloud(["intro"]);
    await tick();
    focusAnswer(0);
  }

  function answer(value: number) {
    if (game.phase !== "asking" || game.tried.includes(value)) return;
    const before = game;
    send({ type: "answer", value });
    if (game.phase === "correct") {
      burst++;
      audio.sfx("sfx-correct");
      void audio.say([pickClip(PRAISE)]);
      announce = `Correct! ${game.stars} ${game.stars === 1 ? "star" : "stars"}.`;
      nextTimer = setTimeout(advance, reduced ? 1400 : 1800);
    } else {
      wobbling = value;
      setTimeout(() => (wobbling = null), 500);
      audio.sfx("sfx-wobble");
      const hint: Clip[] = before.showDots ? [] : ["dots"];
      void audio.say([pickClip(NUDGE), ...hint]);
      announce = `Not quite. ${before.showDots ? "" : "Try counting the dots. "}Have another go.`;
    }
  }

  async function advance() {
    const prevLevel = game.level;
    const wasEased = game.easedOff;
    send({ type: "next" });
    if (game.phase === "done") {
      burst++;
      audio.sfx("sfx-celebrate");
      void audio.say(["end"]);
      announce = `You did it! ${game.stars} stars!`;
      track("game_complete");
      return;
    }
    askAloud(wasEased || game.level < prevLevel ? ["easier"] : []);
    await tick();
    if (answersEl?.contains(document.activeElement) || document.activeElement === document.body) focusAnswer(0);
  }

  function restart() {
    clearTimeout(nextTimer);
    send({ type: "restart" });
    track("game_start");
    askAloud();
    tick().then(() => focusAnswer(0));
  }

  function focusAnswer(i: number) {
    const buttons = answersEl?.querySelectorAll<HTMLButtonElement>("button");
    if (!buttons?.length) return;
    buttons[(i + buttons.length) % buttons.length].focus();
  }

  function hearAgain() {
    if (muted) setMute(false, true);
    askAloud();
  }

  function openGate(href: string, label: string) {
    audio.stopVoice();
    void audio.say(["grownup"]);
    gateTarget = { href, label };
  }

  function onKey(e: KeyboardEvent) {
    if (gateTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    if (game.phase !== "asking") return;
    const buttons = [...(answersEl?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);

    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      focusAnswer(at === -1 ? 0 : at + step);
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      typed += e.key;
      clearTimeout(typedTimer);
      const hit = matchTyped(typed, game.question.options);
      if (hit === "wait") {
        typedTimer = setTimeout(() => {
          const late = matchTyped(typed, game.question.options);
          typed = "";
          if (typeof late === "number") pressFrom(late);
        }, 700);
      } else {
        typed = "";
        if (typeof hit === "number") pressFrom(hit);
      }
    }
  }

  // A typed answer presses the matching button so it squishes like a tap.
  function pressFrom(n: number) {
    const btn = answersEl?.querySelector<HTMLButtonElement>(`button[data-n="${n}"]`);
    btn?.focus();
    btn?.setAttribute("data-pressed", "");
    setTimeout(() => btn?.removeAttribute("data-pressed"), 120);
    answer(n);
  }

  const dotsA = $derived(Array.from({ length: game.question.a }));
  const dotsB = $derived(Array.from({ length: game.question.b }));
</script>

<svelte:window onkeydown={onKey} />

<div class="game" data-phase={game.phase}>
  <header class="bar">
    <button type="button" class="clay-chip grownups" onclick={() => openGate("/", "the Doodle Math home page")}>
      {@html icon("lock-simple")}
      <span>Grown-ups</span>
    </button>

    <div
      class="clay-progress clay-well meter"
      role="progressbar"
      aria-label="Stars"
      aria-valuemin="0"
      aria-valuemax={TOTAL_QUESTIONS}
      aria-valuenow={game.stars}
      aria-valuetext={`${game.stars} of ${TOTAL_QUESTIONS} stars`}
      style:--value={progress}
    >
      <div class="clay-progress__fill"></div>
      <img class="clay-progress__star" src="/art/star-128.webp" alt="" width="50" height="50" />
    </div>

    <button
      type="button"
      class="clay-chip mute"
      aria-pressed={muted}
      onclick={() => setMute(!muted, true)}
    >
      {@html icon(muted ? "speaker-slash" : "speaker-high")}
      <span>{muted ? "Sound off" : "Sound on"}</span>
    </button>
  </header>

  <p class="sr-only" aria-live="polite" aria-atomic="true">{announce}</p>

  <div class="stage">
    {#if game.phase === "ready"}
      <section class="intro" aria-labelledby="intro-title">
        <img
          class="pip-big mascot bob jumpable"
          src="/art/pip-idle-320.webp"
          srcset="/art/pip-idle-320.webp 320w, /art/pip-idle-640.webp 640w"
          sizes="(min-width: 768px) 280px, 200px"
          width="320"
          height="320"
          alt="Pip waving hello"
          data-mascot
        />
        <h1 id="intro-title">Add up with Pip!</h1>
        <p class="intro-line">8 questions. Tap the right number to win a star.</p>
        <button type="button" class="clay-btn clay-btn--lemon clay-btn--xl play" onclick={start}>
          {@html icon("play")} Play
        </button>
      </section>
    {:else if game.phase === "done"}
      <section class="end" aria-labelledby="end-title">
        <img
          class="pip-big mascot jumpable"
          data-jump={reduced ? undefined : ""}
          src="/art/pip-happy-320.webp"
          srcset="/art/pip-happy-320.webp 320w, /art/pip-happy-640.webp 640w"
          sizes="(min-width: 768px) 260px, 180px"
          width="320"
          height="320"
          alt="Pip cheering with both arms up"
          data-mascot
        />
        <h1 id="end-title">You did it!</h1>
        <p class="end-stars">
          {#each Array.from({ length: game.stars }) as _, i (i)}
            <img src="/art/star-128.webp" alt="" width="40" height="40" style:--i={i} />
          {/each}
          <span class="sr-only">{game.stars} stars</span>
        </p>
        <button type="button" class="clay-btn clay-btn--lemon clay-btn--xl" onclick={restart}>
          {@html icon("arrow-counter-clockwise")} Play again
        </button>

        <aside class="grownups-panel clay clay--surface" aria-labelledby="gu-title">
          <h2 id="gu-title">For grown-ups</h2>
          <p>
            That was Pip's addition world. The full app has four worlds that cover the national curriculum from Year 1 to
            Year 6, plus a weekly progress email. Try it free for 14 days.
          </p>
          <div class="gu-actions">
            <button type="button" class="clay-btn clay-btn--peach" onclick={() => openGate("/signup?from=game", "the free trial sign-up")}>
              Start free trial
            </button>
            <button type="button" class="clay-btn clay-btn--cream" onclick={() => openGate("/parents", "the page for parents")}>
              How it works
            </button>
          </div>
        </aside>
      </section>
    {:else}
      <section class="play-area" aria-labelledby="q-title">
        <div class="ask">
          <img
            class="pip mascot jumpable"
            class:bob={game.phase === "asking"}
            data-jump={game.phase === "correct" && !reduced ? "" : undefined}
            src={`/art/pip-${pipMood}-320.webp`}
            width="320"
            height="320"
            alt={pipMood === "happy" ? "Pip cheering" : "Pip"}
            data-mascot
          />
          <div class="bubble clay clay--surface">
            <h1 id="q-title" class="sr-only">{questionText(game.question)}</h1>
            <p class="sum" aria-hidden="true">
              <span>{game.question.a}</span><span class="op">+</span><span>{game.question.b}</span><span class="op">=</span><span
                class="slot"
                class:filled={game.phase === "correct"}>{game.phase === "correct" ? game.question.answer : "?"}</span
              >
            </p>
            <button type="button" class="clay-chip hear" onclick={hearAgain}>
              {@html icon("ear")} Hear it again
            </button>
          </div>
        </div>

        {#if game.showDots}
          <div class="dots" aria-hidden="true">
            <span class="dot-group">{#each dotsA as _, i (i)}<i class="dot dot--a"></i>{/each}</span>
            <span class="dot-plus">+</span>
            <span class="dot-group">{#each dotsB as _, i (i)}<i class="dot dot--b"></i>{/each}</span>
          </div>
        {/if}

        <div class="answers" bind:this={answersEl} role="group" aria-label="Answers">
          {#each game.question.options as n (game.index + "-" + n)}
            {@const tried = game.tried.includes(n)}
            {@const right = game.phase === "correct" && n === game.question.answer}
            <button
              type="button"
              class="clay-btn answer"
              class:tried
              class:right
              class:wobble={wobbling === n}
              data-n={n}
              aria-disabled={tried || game.phase !== "asking"}
              aria-label={tried ? `${n}, already tried` : String(n)}
              onclick={() => answer(n)}
            >
              {n}
            </button>
          {/each}
        </div>
        <p class="keys" aria-hidden="true">{@html icon("keyboard")} Type a number or use the arrow keys</p>
      </section>
    {/if}

    {#if burst > 0 && (game.phase === "correct" || game.phase === "done")}
      {#key burst}
        <div class="confetti" aria-hidden="true">
          {#if reduced}
            <img class="still-star" src="/art/star-256.webp" alt="" width="120" height="120" />
          {:else}
            {#each confetti as c (c.id)}
              <img
                class="piece"
                src="/art/star-128.webp"
                alt=""
                width="40"
                height="40"
                style:--x={`${c.x}px`}
                style:--y={`${c.y}px`}
                style:--r={`${c.r}deg`}
                style:--s={c.s}
                style:--d={`${c.d}ms`}
              />
            {/each}
          {/if}
        </div>
      {/key}
    {/if}
  </div>
</div>

<GrownUpGate target={gateTarget} onclose={() => (gateTarget = null)} />

<style>
  .game {
    min-height: 100dvh;
    display: grid;
    grid-template-rows: auto 1fr;
    background:
      radial-gradient(120% 70% at 50% 100%, rgb(143 227 195 / 0.35), transparent 60%),
      radial-gradient(90% 60% at 10% 0%, rgb(158 212 255 / 0.35), transparent 60%),
      var(--bg);
    color: var(--text);
    overflow: hidden;
  }

  /* ---------- top bar ---------- */
  .bar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 12px;
    align-items: center;
    padding: max(12px, env(safe-area-inset-top)) 16px 8px;
    max-width: 960px;
    width: 100%;
    margin-inline: auto;
  }
  .bar .clay-chip {
    cursor: pointer;
    min-height: 48px;
  }
  .bar .clay-chip :global(svg) {
    width: 22px;
    height: 22px;
  }
  .mute[aria-pressed="false"] {
    --clay: var(--clay-lemon);
  }
  .meter {
    height: 32px;
  }
  @media (max-width: 479px) {
    .bar span {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  }

  /* ---------- stage ---------- */
  .stage {
    position: relative;
    width: 100%;
    max-width: 800px;
    margin-inline: auto;
    padding: 8px 16px max(20px, env(safe-area-inset-bottom));
    display: grid;
    align-content: center;
  }

  .intro,
  .end {
    display: grid;
    justify-items: center;
    text-align: center;
    gap: 14px;
  }
  .pip-big {
    width: min(240px, 52vw);
  }
  .intro h1,
  .end h1 {
    font-size: clamp(2.4rem, 1.8rem + 3vw, 3.75rem);
  }
  .intro-line {
    font-size: 1.3rem;
    font-weight: 700;
    max-width: 24ch;
  }
  .play {
    margin-top: 10px;
    min-width: 220px;
  }

  /* ---------- question ---------- */
  .play-area {
    display: grid;
    gap: 18px;
  }
  .ask {
    display: grid;
    grid-template-columns: minmax(110px, 36%) 1fr;
    align-items: end;
    gap: 8px;
  }
  .pip {
    width: 100%;
  }
  .bubble {
    position: relative;
    padding: 18px 18px 14px;
    display: grid;
    justify-items: center;
    gap: 8px;
    margin-bottom: 18%;
  }
  .bubble::before {
    content: "";
    position: absolute;
    left: -14px;
    bottom: 26px;
    width: 30px;
    height: 30px;
    background: var(--surface);
    border-radius: 6px;
    rotate: 45deg;
    box-shadow: -4px 4px 6px rgb(var(--page-shadow-rgb) / 0.08);
    z-index: -1;
  }
  .sum {
    display: flex;
    align-items: center;
    gap: 0.18em;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: var(--fs-game);
    line-height: 1;
    margin: 0;
  }
  .op {
    font-size: 0.7em;
  }
  .slot {
    display: inline-grid;
    place-items: center;
    min-width: 1.2em;
    padding: 0 0.1em;
    border-radius: 0.3em;
    background: var(--well, rgb(45 42 62 / 0.06));
    box-shadow: var(--clay-well);
  }
  .slot.filled {
    background: var(--clay-mint);
    color: var(--ink);
    box-shadow: var(--clay-in);
  }
  .hear {
    --clay: var(--clay-sky);
    cursor: pointer;
  }
  .hear :global(svg) {
    width: 20px;
    height: 20px;
  }

  .dots {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 14px;
  }
  .dot-group {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    max-width: 180px;
    justify-content: center;
  }
  .dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    box-shadow:
      0 3px 4px rgb(45 42 62 / 0.15),
      inset -2px -2px 4px rgb(0 0 0 / 0.1),
      inset 2px 2px 4px rgb(255 255 255 / 0.6);
  }
  .dot--a {
    background: var(--clay-peach);
  }
  .dot--b {
    background: var(--clay-lilac);
  }
  .dot-plus {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.8rem;
  }

  /* answers: 2x2 on phones (72px tall), a row on tablets and up */
  .answers {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .answer {
    --clay: #fffdf9;
    --h: 72px;
    min-width: 72px;
    padding: 0;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(2.2rem, 1.6rem + 2.5vw, 3.2rem);
  }
  .answer:nth-child(1) { --clay: var(--clay-peach); }
  .answer:nth-child(2) { --clay: var(--clay-mint); }
  .answer:nth-child(3) { --clay: var(--clay-sky); }
  .answer:nth-child(4) { --clay: var(--clay-lilac); }
  .answer.tried {
    --clay: #e9e4ee;
    opacity: 0.55;
    cursor: default;
    box-shadow: var(--clay-well);
    transform: none;
  }
  .answer.right {
    --clay: var(--clay-lemon);
  }
  .answer[aria-disabled="true"]:not(.tried) {
    cursor: default;
  }
  @media (prefers-reduced-motion: no-preference) {
    .answer.wobble {
      animation: wobble 0.45s ease-in-out;
    }
    .answer.right {
      animation: jump 0.6s var(--spring);
    }
  }
  .keys {
    display: none;
    justify-content: center;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
    font-weight: 700;
    margin: 0;
  }
  .keys :global(svg) {
    width: 20px;
    height: 20px;
  }
  @media (hover: hover) and (pointer: fine) {
    .keys {
      display: flex;
    }
  }

  @media (min-width: 640px) {
    .answers {
      grid-template-columns: repeat(4, 1fr);
    }
    .answer {
      --h: 104px;
    }
    .ask {
      grid-template-columns: 200px 1fr;
    }
    .bubble {
      padding: 22px 28px 16px;
    }
  }

  /* ---------- end ---------- */
  .end-stars {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
    margin: 0;
  }
  .end-stars img {
    width: 40px;
  }
  @media (prefers-reduced-motion: no-preference) {
    .end-stars img {
      animation: pop-in 0.5s var(--spring) both;
      animation-delay: calc(var(--i) * 90ms + 300ms);
    }
  }
  .grownups-panel {
    margin-top: 18px;
    padding: 22px;
    text-align: left;
    display: grid;
    gap: 10px;
    max-width: 560px;
  }
  .grownups-panel h2 {
    font-size: 1.5rem;
  }
  .gu-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 6px;
  }

  /* ---------- confetti ---------- */
  .confetti {
    position: absolute;
    left: 50%;
    top: 45%;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 5;
  }
  .piece {
    position: absolute;
    width: 40px;
    height: 40px;
    left: -20px;
    top: -20px;
    opacity: 0;
    animation: burst 1.5s linear forwards;
    animation-delay: var(--d);
  }
  .still-star {
    position: absolute;
    width: 120px;
    left: -60px;
    top: -60px;
    animation: fade 1.4s ease forwards;
  }
  /* up and out, then tumble down */
  @keyframes burst {
    0% {
      opacity: 1;
      transform: translate(0, 0) rotate(0) scale(0.2);
      animation-timing-function: cubic-bezier(0.2, 0.8, 0.4, 1);
    }
    45% {
      opacity: 1;
      transform: translate(calc(var(--x) * 0.75), var(--y)) rotate(calc(var(--r) * 0.5)) scale(var(--s));
      animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.6);
    }
    100% {
      opacity: 0;
      transform: translate(var(--x), calc(var(--y) + 340px)) rotate(var(--r)) scale(var(--s));
    }
  }
  @keyframes fade {
    0%,
    70% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  @keyframes pop-in {
    from {
      transform: scale(0);
    }
    to {
      transform: scale(1);
    }
  }
</style>
