// Helpers shared by the API routes.

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

/** Accept JSON or a regular form post, so forms still work without JavaScript. */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    try {
      const v = await request.json();
      return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  const form = await request.formData();
  return Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]));
}

export const wantsHtml = (request: Request) => !(request.headers.get("content-type") ?? "").includes("application/json");

/** Same-origin check for state-changing requests. */
export function sameOrigin(request: Request, url: URL) {
  const origin = request.headers.get("origin");
  return !origin || origin === url.origin;
}
