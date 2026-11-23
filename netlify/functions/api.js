// Ittefaq Electronics API (Netlify Function) - products, admin login, chatbot. Database: Supabase.
const crypto = require("crypto");
const E = process.env;
const res = (s, b) => ({ statusCode: s, headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

// ---- admin token (signed, expires in 12h) ----
const sign = (t) => crypto.createHmac("sha256", E.SECRET_KEY || "dev-secret").update(String(t)).digest("hex");
const makeToken = () => { const exp = Date.now() + 12 * 3600e3; return `${exp}.${sign(exp)}`; };
const valid = (tok) => {
  if (!tok) return false;
  const [exp, sig] = tok.split(".");
  if (!exp || !sig || Date.now() > +exp) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// ---- Supabase REST helper ----
async function sb(path, method = "GET", body) {
  const r = await fetch(`${E.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    // New-style keys (sb_secret_...) go in "apikey" only; legacy JWT keys (eyJ...) also need the Bearer header
    headers: { apikey: E.SUPABASE_SERVICE_KEY, ...(E.SUPABASE_SERVICE_KEY.startsWith("eyJ") ? { Authorization: `Bearer ${E.SUPABASE_SERVICE_KEY}` } : {}), "Content-Type": "application/json", Prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`Database error ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}
const all = () => sb("products?select=*&order=id.desc");

function clean(d) {
  const price = parseInt(d.price, 10), stock = parseInt(d.stock ?? 0, 10);
  if (!d.name?.trim() || !d.category?.trim() || isNaN(price) || isNaN(stock)) return null;
  return { name: d.name.trim(), category: d.category.trim(), price, stock, emoji: (d.emoji || "🔌").trim(), description: (d.description || "").trim(), image_url: (d.image_url || "").trim() };
}

// ---- chatbot ----
const money = (n) => "Rs " + n.toLocaleString("en-US");
const line = (p) => `${p.emoji} ${p.name} - ${money(p.price)} (${p.stock > 0 ? p.stock + " in stock" : "currently out of stock"})`;
const ALIAS = { ac: "ACs", tv: "TVs", led: "TVs", fridge: "Refrigerators", phone: "Mobiles", mobile: "Mobiles", laptop: "Laptops", fan: "Fans", washing: "Home Appliances", headphone: "Audio", powerbank: "Accessories" };
const STOP = new Set(["the", "for", "and", "price", "have", "you", "any", "show", "under", "below", "best", "cheap", "with", "what", "your"]);

function ruleBot(msg, products) {
  const m = msg.toLowerCase();
  if (/\b(hi|hello|hey|salam|assalam)/.test(m) && m.length < 30) return "Assalam o Alaikum! Welcome to Ittefaq Electronics. Ask me about any product, price, category or your budget.";
  if (/contact|phone number|address|location|opening|timing|where are you/.test(m)) return "Visit Ittefaq Electronics in store or call us. Opening hours: 10am - 9pm, Monday to Saturday. (Edit shop details in netlify/functions/api.js.)";
  if (/warranty|guarantee/.test(m)) return "Most products come with the manufacturer's warranty. Ask about a specific product to see its warranty details.";
  if (/categor|what do you (sell|have)|all products|catalog/.test(m)) return "We sell: " + [...new Set(products.map((p) => p.category))].sort().join(", ") + ". Which one are you interested in?";
  const nums = [...m.matchAll(/\d[\d,]*/g)].map((x) => +x[0].replace(/,/g, "")).filter((n) => n >= 100);
  const k = m.match(/(\d+)\s*k\b/); if (k) nums.push(+k[1] * 1000);
  const want = new Set(Object.entries(ALIAS).filter(([w]) => new RegExp("\\b" + w).test(m)).map(([, c]) => c));
  const words = (m.match(/[a-z0-9]{3,}/g) || []).filter((w) => !STOP.has(w));
  const hits = products.filter((p) => want.has(p.category) || p.category.toLowerCase().split(/\W+/).some((c) => c.length > 2 && m.includes(c)) || words.some((w) => p.name.toLowerCase().includes(w)));
  let pool = hits.length ? hits : products;
  if (nums.length && /under|below|budget|within|less|upto|up to|sasta|cheap/.test(m)) {
    pool = pool.filter((p) => p.price <= Math.max(...nums));
    if (!pool.length) return `Sorry, I couldn't find anything within ${money(Math.max(...nums))}. Try a higher budget.`;
  } else if (/cheap|sasta|lowest|affordable/.test(m)) pool = [...pool].sort((a, b) => a.price - b.price).slice(0, 3);
  if (!hits.length && pool === products) return "I couldn't match that to a product. Try asking e.g. 'Do you have AC?', 'laptops under 150000' or 'show all categories'.";
  pool = pool.slice(0, 5);
  return "Here is what I found:\n" + pool.map(line).join("\n") + (pool.length === 1 ? "\n" + pool[0].description : "");
}

async function claudeBot(msg, history, products) {
  const catalog = products.map((p) => `- ${p.name} | ${p.category} | Rs ${p.price} | stock ${p.stock} | ${p.description}`).join("\n");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": E.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-5-5", max_tokens: 400,
      system: "You are the friendly sales assistant of Ittefaq Electronics (Pakistan). Answer ONLY using this catalog, prices in PKR. If something is not in the catalog, say you don't have it. Be brief.\n" + catalog,
      messages: [...(history || []).slice(-6), { role: "user", content: msg }],
    }),
  });
  if (!r.ok) throw new Error("claude");
  return (await r.json()).content.map((b) => b.text || "").join("");
}

// ---- router ----
exports.handler = async (event) => {
  try {
    const path = event.path.replace(/^\/(\.netlify\/functions\/api|api)/, "") || "/";
    const method = event.httpMethod;
    const q = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};
    const isAdmin = valid((event.headers.authorization || "").replace("Bearer ", ""));
    const need = () => (isAdmin ? null : res(401, { error: "Please log in as admin" }));

    if (path === "/me") return res(200, { admin: isAdmin });
    if (path === "/login" && method === "POST") {
      if (E.ADMIN_PASSWORD && body.password === E.ADMIN_PASSWORD) return res(200, { token: makeToken() });
      return res(401, { error: "Wrong password" });
    }
    if (path === "/categories") return res(200, [...new Set((await all()).map((p) => p.category))].sort());

    if (path === "/products" && method === "GET") {
      let url = "products?select=*&order=id.desc";
      if (q.category) url += `&category=eq.${encodeURIComponent(q.category)}`;
      const term = (q.q || "").replace(/[,()*%]/g, " ").trim();
      if (term) url += `&or=(name.ilike.*${encodeURIComponent(term)}*,description.ilike.*${encodeURIComponent(term)}*,category.ilike.*${encodeURIComponent(term)}*)`;
      return res(200, await sb(url));
    }
    if (path === "/products" && method === "POST") {
      if (need()) return need();
      const v = clean(body); if (!v) return res(400, { error: "Name, category and numeric price are required" });
      return res(201, (await sb("products", "POST", v))[0]);
    }
    const m = path.match(/^\/products\/(\d+)$/);
    if (m && method === "PUT") {
      if (need()) return need();
      const v = clean(body); if (!v) return res(400, { error: "Invalid data" });
      await sb(`products?id=eq.${m[1]}`, "PATCH", v); return res(200, { ok: true });
    }
    if (m && method === "DELETE") {
      if (need()) return need();
      await sb(`products?id=eq.${m[1]}`, "DELETE"); return res(200, { ok: true });
    }
    if (path === "/chat" && method === "POST") {
      const msg = (body.message || "").trim().slice(0, 500);
      if (!msg) return res(200, { reply: "Please type a question." });
      const products = await all();
      if (E.ANTHROPIC_API_KEY) { try { return res(200, { reply: await claudeBot(msg, body.history, products) }); } catch (e) { /* fall back */ } }
      return res(200, { reply: ruleBot(msg, products) });
    }
    return res(404, { error: "Not found" });
  } catch (e) {
    console.error(e);
    return res(500, { error: "Server error. Check Supabase settings in Netlify." });
  }
};
