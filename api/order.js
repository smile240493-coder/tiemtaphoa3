/* Nhận đơn hàng từ website và gửi về Telegram của chủ cửa hàng.
   Token và Chat ID lưu ở Vercel (Settings > Environment Variables), KHÔNG ghi vào mã nguồn. */
module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ ok: false }); }
  const T = process.env.TELEGRAM_BOT_TOKEN, C = process.env.TELEGRAM_CHAT_ID;
  if (!T || !C) return res.status(500).json({ ok: false, error: "config" });
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b) return res.status(400).json({ ok: false });
  if (b.website) return res.status(200).json({ ok: true }); /* ô ẩn chống spam: bỏ qua */
  const s = (v, n) => String(v || "").replace(/[\r\n]+/g, " ").slice(0, n);
  const name = s(b.name, 80), phone = s(b.phone, 15), addr = s(b.addr, 200), note = s(b.note, 300);
  if (!name || !/^0\d{9}$/.test(phone) || !addr || !Array.isArray(b.items) || !b.items.length)
    return res.status(400).json({ ok: false });
  const items = b.items.slice(0, 50).map(x => "• " + s(x, 120)).join("\n");
  const total = new Intl.NumberFormat("vi-VN").format(Number(b.total) || 0) + "₫";
  const text = "🛒 ĐƠN HÀNG MỚI " + s(b.id, 20) + "\n👤 " + name + "\n📞 " + phone + "\n📍 " + addr +
    (note ? "\n📝 " + note : "") + "\n\n" + items + "\n\n💰 Tổng: " + total;
  try {
    const r = await fetch("https://api.telegram.org/bot" + T + "/sendMessage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: C, text })
    });
    if (!r.ok) throw new Error(String(r.status));
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(502).json({ ok: false }); }
};
