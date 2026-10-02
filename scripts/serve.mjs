// Serve the production build (static pages + API) on PORT, default 4322,
// so it can run next to `astro dev` on 4321.
process.env.PORT ??= "4322";
process.env.HOST ??= "localhost";
await import("../dist/server/entry.mjs");
