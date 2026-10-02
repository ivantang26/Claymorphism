import type { APIRoute } from "astro";
import { parseTrial, hasErrors } from "~/lib/validation";
import { append } from "~/lib/store";
import { json, readBody, sameOrigin, wantsHtml } from "~/lib/http";
import { count } from "~/lib/metrics";

export const prerender = false;

// FR-4: email, optional child's first name, year group. Nothing else.
export const POST: APIRoute = async ({ request, url, redirect }) => {
  if (!sameOrigin(request, url)) return json({ error: "Bad origin" }, 403);
  const { data, errors } = parseTrial(await readBody(request));
  const html = wantsHtml(request);
  if (hasErrors(errors)) {
    return html ? redirect("/signup?error=1", 303) : json({ errors }, 422);
  }
  await append("trials.jsonl", {
    email: data.email,
    childFirstName: data.childFirstName || null,
    yearGroup: data.yearGroup,
    plan: data.plan,
    source: data.source,
    createdAt: new Date().toISOString(),
  });
  await count("trial_started", "/signup", { source: data.source });
  return html ? redirect("/signup/thanks", 303) : json({ ok: true });
};
