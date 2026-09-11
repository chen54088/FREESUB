const ALLOWED_FILES = new Set(["v2ray.txt", "clash.yaml", "singbox.json", "residential.txt", "residential-clash.yaml", "residential-singbox.json"]);
const ALLOWED_DIRS = ["by-country", "residential-by-country", "residential-relaxed-by-country"];
function allowedPath(pathname) {
  const path = pathname.replace(/^\/+/, "").replace(/\/+$/g, "");
  if (!path || path.includes("..") || path.includes("\0")) return null;
  const parts = path.split("/");
  if (parts.length === 1 && ALLOWED_FILES.has(parts[0])) return `output/${parts[0]}`;
  if (parts.length === 2 && ALLOWED_DIRS.includes(parts[0]) && /^[A-Za-z0-9_-]+\.(txt|yaml|json)$/.test(parts[1])) return `output/${parts[0]}/${parts[1]}`;
  return null;
}
function authorized(request, env) {
  if (!env.SUBSCRIPTION_KEY) return true;
  const header = request.headers.get("authorization") || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : new URL(request.url).searchParams.get("key");
  return supplied === env.SUBSCRIPTION_KEY;
}
export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method Not Allowed", { status: 405 });
    if (!authorized(request, env)) return new Response("Unauthorized", { status: 401 });
    const filePath = allowedPath(new URL(request.url).pathname);
    if (!filePath) return new Response("Not Found", { status: 404 });
    const owner = env.GITHUB_OWNER || "chen54088", repo = env.GITHUB_REPO || "FREESUB", branch = env.GITHUB_BRANCH || "main";
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;
    const upstream = await fetch(apiUrl, { headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github.raw+json", "User-Agent": "freesub-subscription-worker" }});
    if (!upstream.ok) return new Response("Not Found", { status: upstream.status === 404 ? 404 : 502 });
    const headers = new Headers({ "Content-Type": filePath.endsWith(".json") ? "application/json; charset=utf-8" : filePath.endsWith(".yaml") ? "text/yaml; charset=utf-8" : "text/plain; charset=utf-8", "Cache-Control": "public, max-age=120, s-maxage=300", "X-Content-Source": "github-private" });
    return new Response(request.method === "HEAD" ? null : upstream.body, { status: 200, headers });
  }
};
