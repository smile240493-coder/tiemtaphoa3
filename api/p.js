/* Trang riêng cho từng sản phẩm: /p/12-ten-san-pham
   Hàm này lấy khung trang chi-tiet.html rồi chèn tên, giá, ảnh của sản phẩm vào thẻ chia sẻ (Facebook, Zalo)
   để khi đăng link lên Facebook sẽ hiện đúng ảnh và tên sản phẩm đó. */
const SITE = "https://www.pundeptrai.top"; /* Đổi nếu bạn đổi tên miền */
const DEFAULT_IMG = SITE + "/og-tiem-tap-hoa.jpg";
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const vnd = n => new Intl.NumberFormat("vi-VN").format(n) + "₫";
const getText = async u => { const r = await fetch(u, { headers: { "user-agent": "tiemtaphoa-render" } }); if (!r.ok) throw new Error(String(r.status)); return r.text(); };

async function loadProduct(id) {
  try { /* 1) Supabase: đọc địa chỉ và khóa công khai trong js/config.js */
    const cfg = await getText(SITE + "/js/config.js");
    const u = (cfg.match(/supabaseUrl\s*:\s*"([^"]*)"/) || [])[1] || "";
    const k = (cfg.match(/supabaseKey\s*:\s*"([^"]*)"/) || [])[1] || "";
    let origin = ""; try { origin = new URL(u).origin; } catch (e) {}
    if (k && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(origin)) {
      const r = await fetch(origin + "/rest/v1/products?id=eq." + id + "&select=*", { headers: { apikey: k } });
      if (r.ok) { const rows = await r.json(); const p = rows[0];
        if (p) return { id: p.id, name: p.name, price: +p.price, old: +p.old || 0, desc: p.descr || "", imgs: Array.isArray(p.imgs) ? p.imgs : [] }; }
    }
  } catch (e) {}
  try { /* 2) js/data.js (khi chưa dùng Supabase) */
    const t = await getText(SITE + "/js/data.js");
    const j = JSON.parse(t.trim().replace(/^window\.SHOP\s*=\s*/, "").replace(/;\s*$/, ""));
    const p = (j.products || []).find(x => String(x.id) === String(id));
    if (p) return { id: p.id, name: p.name, price: +p.price, old: +p.old || 0, desc: p.desc || "", imgs: Array.isArray(p.imgs) ? p.imgs : [] };
  } catch (e) {}
  return null;
}

const absImg = p => {
  const i = (p.imgs && p.imgs[0]) || "";
  if (/^https?:\/\//.test(i)) return { url: i, def: false };
  if (i && !/^data:/.test(i)) return { url: SITE + "/" + i.replace(/^\/+/, ""), def: false };
  return { url: DEFAULT_IMG, def: true };
};

function seoBlock(p, url) {
  if (!p) return '<title>Không tìm thấy sản phẩm – Tiệm Tạp Hóa</title><meta name="robots" content="noindex">';
  const im = absImg(p), price = vnd(p.price);
  const desc = (price + (p.desc ? " · " + p.desc : "") + " · Tiệm Tạp Hóa, giao toàn quốc, hotline 0989740300").slice(0, 200);
  const ld = { "@context": "https://schema.org", "@type": "Product", name: p.name, image: [im.url], description: p.desc || p.name,
    offers: { "@type": "Offer", url, priceCurrency: "VND", price: String(p.price), availability: "https://schema.org/InStock" } };
  return [
    "<title>" + esc(p.name) + " – Tiệm Tạp Hóa</title>",
    '<meta name="description" content="' + esc(desc) + '">',
    '<link rel="canonical" href="' + esc(url) + '">',
    '<meta property="og:type" content="product"><meta property="og:locale" content="vi_VN"><meta property="og:site_name" content="Tiệm Tạp Hóa">',
    '<meta property="og:title" content="' + esc(p.name + " – " + price) + '"><meta property="og:description" content="' + esc(desc) + '">',
    '<meta property="og:url" content="' + esc(url) + '"><meta property="og:image" content="' + esc(im.url) + '">',
    im.def ? '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' : "",
    '<meta property="og:image:alt" content="' + esc(p.name) + '">',
    '<meta property="product:price:amount" content="' + esc(p.price) + '"><meta property="product:price:currency" content="VND">',
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="' + esc(im.url) + '">',
    '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, "\\u003c") + "</script>"
  ].join("");
}

module.exports = async (req, res) => {
  const raw = String((req.query && req.query.id) || "");
  const id = parseInt(raw, 10);
  let product = null;
  if (Number.isSafeInteger(id) && id > 0) { try { product = await loadProduct(id); } catch (e) {} }
  let html;
  try { html = await getText(SITE + "/chi-tiet.html"); }
  catch (e) { res.statusCode = 302; res.setHeader("Location", "/san-pham"); return res.end(); }
  const url = product ? SITE + "/p/" + product.id + (slug(product.name) ? "-" + slug(product.name) : "") : SITE + "/san-pham";
  html = html.replace(/<!--SEO-->[\s\S]*?<!--\/SEO-->/, () => seoBlock(product, url));
  res.statusCode = product ? 200 : 404;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", product ? "public, s-maxage=60, stale-while-revalidate=300" : "public, s-maxage=10");
  res.end(html);
};
