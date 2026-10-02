<script lang="ts">
  // Parental gate (FR-2). Shown before any route out of the game.
  import { makeChallenge, type Challenge } from "~/lib/gate";
  import { icon } from "~/lib/icons";
  import { track } from "~/lib/analytics";

  interface Props {
    /** Where to go once a grown-up passes the gate; null keeps the dialog closed. */
    target: { href: string; label: string } | null;
    onclose: () => void;
  }
  let { target, onclose }: Props = $props();

  let dialog: HTMLDialogElement;
  let challenge = $state<Challenge>(makeChallenge());
  let message = $state("");
  let misses = $state(0);

  $effect(() => {
    if (target && !dialog.open) {
      challenge = makeChallenge();
      message = "";
      misses = 0;
      dialog.showModal();
    } else if (!target && dialog.open) {
      dialog.close();
    }
  });

  function pick(n: number) {
    if (!target) return;
    if (n === challenge.target) {
      track("gate_passed", { to: target.href.startsWith("/signup") ? "signup" : "page" });
      window.location.assign(target.href);
      return;
    }
    misses++;
    if (misses >= 3) {
      onclose();
      return;
    }
    challenge = makeChallenge();
    message = "That's not it. Here's a new number.";
  }
</script>

<dialog
  bind:this={dialog}
  class="gate clay clay--surface"
  aria-labelledby="gate-title"
  aria-describedby="gate-ask"
  oncancel={(e) => {
    e.preventDefault();
    onclose();
  }}
>
  <div class="gate-top">
    <span class="lock clay-badge" aria-hidden="true">{@html icon("lock-simple")}</span>
    <div>
      <h2 id="gate-title">Grown-ups only</h2>
      <p class="why">This goes to {target?.label ?? "another page"}.</p>
    </div>
  </div>

  <p id="gate-ask" class="ask">Tap the number <strong>{challenge.words}</strong></p>

  <div class="nums">
    {#each challenge.options as n (n)}
      <button type="button" class="clay-btn clay-btn--cream num" onclick={() => pick(n)}>{n}</button>
    {/each}
  </div>

  <p class="msg" role="status">{message}</p>

  <button type="button" class="clay-btn clay-btn--lemon back" onclick={onclose}>
    {@html icon("arrow-left")} Back to the game
  </button>
</dialog>

<style>
  .gate {
    width: min(460px, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    border: 0;
    padding: 28px;
    color: var(--on-surface);
  }
  .gate::backdrop {
    background: rgb(45 42 62 / 0.55);
  }
  .gate-top {
    display: flex;
    gap: 14px;
    align-items: center;
  }
  .lock {
    --size: 56px;
    --clay: var(--clay-lilac);
  }
  h2 {
    font-size: 1.75rem;
  }
  .why {
    font-size: 1rem;
  }
  .ask {
    margin-top: 18px;
    font-size: 1.2rem;
  }
  .ask strong {
    display: block;
    font-family: var(--font-display);
    font-size: 1.9rem;
    line-height: 1.2;
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 16px;
  }
  .num {
    --h: 64px;
    padding: 0;
    font-size: 1.6rem;
    font-weight: 800;
  }
  .msg {
    min-height: 1.6em;
    margin-top: 12px;
    font-weight: 700;
  }
  .back {
    width: 100%;
    margin-top: 6px;
  }
  .back :global(svg) {
    width: 1.1em;
    height: 1.1em;
  }
</style>
