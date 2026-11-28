/* Tự động đổi link Shopee của khách thành link tiếp thị liên kết của cửa hàng.
   Dùng Shopee Affiliate Open API (generateShortLink). Khóa bí mật CHỈ nằm ở Vercel (Environment Variables):
   SHOPEE_APP_ID và SHOPEE_SECRET. Không bao giờ ghi vào config.js hoặc GitHub. */
const crypto = require("crypto");
const SITE = "https://www.pundeptrai.top"; /* Đổi nếu bạn đổi tên miền */
const API = "https://open-api.affiliate.shopee.vn/graphql";
const SHORT_HOSTS = /^(s\.shopee\.vn|shope\.ee|shp\.ee|vn\.shp\.ee)$/i;
const okHost = h => { h = String(h).toLowerCase(); return h === "shopee.vn" || h.endsWith(".shopee.vn") || h === "shp.ee" || h.endsWith(".shp.ee") || h === "shope.ee" || h.endsWith(".shope.ee"); };
const sha = s => crypto.createHash("sha256").update(s).digest("hex");
const hits = new Map(); /* giới hạn tạm: 20 lần mỗi phút cho mỗi địa chỉ IP (theo từng máy chủ đang chạy) */

const send = (res, code, obj) => { res.statusCode = code; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(obj)); };
const getText = async u => { const r = await fetch(u, { headers: { "user-agent": "tiemtaphoa-aff" } }); if (!r.ok) throw new Error(String(r.status)); return r.text(); };

async function supa() { /* địa chỉ và khóa công khai của Supabase, đọc từ js/config.js */
  const cfg = await getText(SITE + "/js/config.js");
  const aid = (cfg.match(/shopeeAffiliateId\s*:\s*"\s*(\d{5,20})\s*"/) || [])[1] || "";
  const u = (cfg.match(/supabaseUrl\s*:\s*"([^"]*)"/) || [])[1] || "";
  const k = (cfg.match(/supabaseKey\s*:\s*"([^"]*)"/) || [])[1] || "";
  let origin = ""; try { origin = new URL(u).origin; } catch (e) {}
  if (!k || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(origin)) throw new Error("supabase");
  return { origin, key: k, aff: aid };
}
async function rpc(s, name, args) {
  const r = await fetch(s.origin + "/rest/v1/rpc/" + name, { method: "POST", headers: { apikey: s.key, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error("rpc " + r.status);
  return r.json();
}
/* Lấy mã cửa hàng và mã sản phẩm từ link, đi theo link rút gọn nếu cần. Không dùng phần tracking đi kèm link. */
async function canonical(link) {
  let u = new URL(link);
  for (let hop = 0; hop < 5; hop++) {
    if (u.protocol !== "https:" || !okHost(u.hostname)) throw new Error("host");
    const m = u.pathname.match(/-i\.(\d{1,12})\.(\d{1,15})(?:\/|$)/) || u.pathname.match(/\/product\/(\d{1,12})\/(\d{1,15})(?:\/|$)/);
    if (m) return "https://shopee.vn/product/" + m[1] + "/" + m[2];
    if (!SHORT_HOSTS.test(u.hostname) && !/universal-link/.test(u.pathname)) break;
    const r = await fetch(u.toString(), { redirect: "manual", headers: { "user-agent": "Mozilla/5.0" } });
    const loc = r.headers && r.headers.get ? r.headers.get("location") : null;
    if (!loc) break;
    u = new URL(loc, u);
  }
  throw new Error("not_product");
}
async function shortLink(app, secret, url, code) {
  const query = "mutation{generateShortLink(input:{originUrl:" + JSON.stringify(url) + ",subIds:[" + JSON.stringify(code) + "]}){shortLink}}";
  const payload = JSON.stringify({ query });
  const ts = Math.floor(Date.now() / 1000);
  const sig = sha(app + ts + payload + secret);
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "SHA256 Credential=" + app + ", Timestamp=" + ts + ", Signature=" + sig }, body: payload });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (j.errors && j.errors.length) { const e = new Error("shopee"); e.detail = String(j.errors[0].message || "").slice(0, 160); throw e; }
  const l = j.data && j.data.generateShortLink && j.data.generateShortLink.shortLink;
  if (!r.ok || !/^https:\/\/[a-z0-9.-]*(shopee\.vn|shope\.ee|shp\.ee)\/\S+$/i.test(String(l || ""))) { const e = new Error("shopee"); e.detail = "HTTP " + r.status; throw e; }
  return l;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return send(res, 405, { error: "method" }); }
  const APP = process.env.SHOPEE_APP_ID, SEC = process.env.SHOPEE_SECRET;
  const org = req.headers && req.headers.origin;
  if (org && org !== SITE && org !== "https://pundeptrai.top" && !/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(org)) return send(res, 403, { error: "origin" });
  const ip = String((req.headers && (req.headers["x-forwarded-for"] || "")) || "").split(",")[0].trim() || "?";
  const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (h.length >= 20) return send(res, 429, { error: "rate" });
  h.push(now); hits.set(ip, h);
  let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = null; } }
  const code = String(b && b.code || "").trim().toUpperCase(), phone = String(b && b.phone || "").trim();
  if (!/^HT[A-Z2-9]{6}$/.test(code) || !/^0\d{9}$/.test(phone)) return send(res, 400, { error: "input" });
  try {
    const s = await supa();
    if (!s.aff && !(APP && SEC)) return send(res, 501, { error: "not_configured" });
    const rows = await rpc(s, "cashback_lookup", { p_code: code, p_phone: phone });
    const row = rows && rows[0];
    if (!row) return send(res, 404, { error: "not_found" });
    if (row.aff_link) return send(res, 200, { link: row.aff_link });
    const url = await canonical(row.shopee_link);
    const link = s.aff /* ưu tiên dùng mã tiếp thị liên kết của cửa hàng */
      ? "https://s.shopee.vn/an_redir?origin_link=" + encodeURIComponent(url) + "&affiliate_id=" + s.aff + "&sub_id=" + encodeURIComponent(code)
      : await shortLink(APP, SEC, url, code);
    try { await rpc(s, "cashback_set_aff", { p_code: code, p_phone: phone, p_aff: link }); } catch (e) {}
    return send(res, 200, { link });
  } catch (e) {
    if (e.message === "not_product" || e.message === "host") return send(res, 422, { error: "not_product", detail: "Link chưa phải link sản phẩm Shopee" });
    if (e.message === "shopee") return send(res, 502, { error: "shopee", detail: e.detail || "" });
    return send(res, 500, { error: "server" });
  }
};
