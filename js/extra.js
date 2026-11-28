/* Trang dành cho khách: "Đặt hàng theo ảnh" và "Hoàn tiền Shopee". Dùng cùng cấu hình js/config.js */
(function () {
  "use strict";
  var C = window.CFG || {};
  var origin = function (u) { try { return new URL(u).origin; } catch (e) { return ""; } };
  var URLB = origin(C.supabaseUrl || ""), KEY = C.supabaseKey || "", ON = !!(URLB && KEY);
  var page = document.body && document.body.dataset ? document.body.dataset.page : "";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var vnd = function (n) { return new Intl.NumberFormat("vi-VN").format(n) + "₫"; };
  var ZALO = "https://zalo.me/0989740300";
  var ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  function rand(n) {
    var b = new Uint32Array(n), s = "", i;
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(b);
    else for (i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 4294967296);
    for (i = 0; i < n; i++) s += ALPHA[b[i] % ALPHA.length];
    return s;
  }
  function msg(el, html, bad) { if (!el) return; el.hidden = false; el.className = "xmsg" + (bad ? " bad" : ""); el.innerHTML = html; }
  function hook(o) {
    if (!C.orderHook) return;
    try { fetch(C.orderHook, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(o) }); } catch (e) {}
  }
  function api(path, opt) {
    var h = { apikey: KEY };
    if (opt.json) h["Content-Type"] = "application/json";
    for (var k in (opt.headers || {})) h[k] = opt.headers[k];
    return fetch(URLB + path, { method: "POST", headers: h, body: opt.json ? JSON.stringify(opt.json) : opt.body });
  }
  function realShrink(f, max, q) {
    return new Promise(function (ok, no) {
      var r = new FileReader();
      r.onload = function () {
        var i = new Image();
        i.onload = function () {
          var k = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(i.width * k)); c.height = Math.max(1, Math.round(i.height * k));
          c.getContext("2d").drawImage(i, 0, 0, c.width, c.height);
          c.toBlob(function (b) { b ? ok(b) : no(new Error("shrink")); }, "image/jpeg", q);
        };
        i.onerror = function () { no(new Error("img")); };
        i.src = r.result;
      };
      r.onerror = function () { no(new Error("read")); };
      r.readAsDataURL(f);
    });
  }
  var shrink = function (f, m, q) { return (window.__testShrink || realShrink)(f, m, q); };
  function fail(stage, r) {
    return r.text().then(function (t) {
      var d = "";
      try { var j = JSON.parse(t); d = j.message || j.error || j.hint || ""; } catch (e) { d = t || ""; }
      var e = new Error(stage + " " + r.status + (d ? " " + String(d).replace(/\s+/g, " ").slice(0, 90) : ""));
      throw e;
    }, function () { throw new Error(stage + " " + r.status); });
  }
  function why(err) { return ' <small style="font-weight:500;opacity:.8">(Mã lỗi: ' + esc(String(err && err.message || err).slice(0, 140)) + ")</small>"; }
  var field = function (f, k, n) { return String(f.get(k) == null ? "" : f.get(k)).trim().slice(0, n); };

  /* ===== Đặt hàng theo ảnh ===== */
  function initPhoto() {
    var files = [], inp = $("pimg"), prev = $("pprev"), form = $("pf"), out = $("pm"), btn = $("pb");
    function render() {
      prev.innerHTML = files.map(function (f, i) {
        return '<div><img src="' + f.url + '" alt="Ảnh ' + (i + 1) + '"><button type="button" data-rm="' + i + '" aria-label="Xóa ảnh ' + (i + 1) + '">×</button></div>';
      }).join("");
    }
    prev.addEventListener("click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("[data-rm]") : null;
      if (!b) return;
      var i = +b.dataset.rm;
      try { URL.revokeObjectURL(files[i].url); } catch (x) {}
      files.splice(i, 1); render();
    });
    inp.addEventListener("change", async function () {
      var list = Array.prototype.slice.call(inp.files || []), over = false;
      for (var k = 0; k < list.length; k++) {
        if (files.length >= 3) { over = true; break; }
        try { var b = await shrink(list[k], 1280, 0.82); files.push({ blob: b, url: URL.createObjectURL(b) }); }
        catch (e) { msg(out, "Không đọc được một ảnh, bạn thử ảnh khác nhé.", true); }
      }
      inp.value = ""; render();
      if (over) msg(out, "Chỉ nhận tối đa 3 ảnh mỗi yêu cầu.", true);
    });
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var f = new FormData(form);
      if (f.get("website")) return;
      var name = field(f, "name", 80), phone = field(f, "phone", 15), addr = field(f, "addr", 200), note = field(f, "note", 500), link = field(f, "link", 480);
      var qty = Math.max(1, Math.min(999, parseInt(f.get("qty"), 10) || 1));
      if (!files.length) return msg(out, "Vui lòng chọn ít nhất 1 ảnh sản phẩm.", true);
      if (!/^0\d{9}$/.test(phone)) return msg(out, "Số điện thoại cần đủ 10 chữ số, bắt đầu bằng 0.", true);
      if (link && !/^https?:\/\/\S+$/i.test(link)) return msg(out, "Link tham khảo chưa đúng (cần bắt đầu bằng http hoặc https).", true);
      if (!ON) return msg(out, 'Tính năng này cần kết nối cơ sở dữ liệu. Bạn vui lòng gửi ảnh qua <a href="' + ZALO + '" target="_blank" rel="noopener">Zalo</a> nhé.', true);
      btn.disabled = true; btn.textContent = "Đang gửi…"; msg(out, "Đang tải ảnh lên, vui lòng chờ…");
      try {
        var paths = [], i;
        for (i = 0; i < files.length; i++) {
          var p = "rq/" + Date.now() + "-" + rand(10) + ".jpg";
          var r = await api("/storage/v1/object/requests/" + p, { headers: { "Content-Type": "image/jpeg" }, body: files[i].blob });
          if (!r.ok) await fail("upload", r);
          paths.push(p);
        }
        var row = { name: name, phone: phone, addr: addr, note: note, qty: qty, link: link, images: paths }, code = "", done = false;
        for (var t = 0; t < 3 && !done; t++) {
          code = "AN" + rand(6);
          var r2 = await api("/rest/v1/photo_orders", { json: Object.assign({ code: code }, row), headers: { Prefer: "return=minimal" } });
          if (r2.ok) done = true; else if (r2.status !== 409) await fail("insert", r2);
        }
        if (!done) throw new Error("code");
        hook({ id: code, name: name, phone: phone, addr: addr, note: "Đặt theo ảnh. " + note, total: 0, items: ["[Đặt theo ảnh] " + note + " × " + qty + " (" + paths.length + " ảnh, xem trong trang quản trị)"] });
        form.reset(); files.forEach(function (x) { try { URL.revokeObjectURL(x.url); } catch (z) {} }); files = []; render();
        msg(out, "🎉 Đã gửi yêu cầu! Mã của bạn: <b>" + code + "</b>. Tiệm Tạp Hóa sẽ liên hệ báo giá qua điện thoại hoặc Zalo. Bạn chỉ chốt đơn khi đồng ý giá.");
      } catch (err) {
        msg(out, 'Chưa gửi được yêu cầu. Bạn thử lại hoặc nhắn ảnh qua <a href="' + ZALO + '" target="_blank" rel="noopener">Zalo</a> nhé.' + why(err), true);
      } finally { btn.disabled = false; btn.textContent = "Gửi yêu cầu"; }
    });
  }

  /* ===== Hoàn tiền Shopee ===== */
  function isShopee(u) {
    try {
      var x = new URL(u); if (x.protocol !== "https:") return false;
      var h = x.hostname.toLowerCase();
      return h === "shopee.vn" || /\.shopee\.vn$/.test(h) || h === "shp.ee" || /\.shp\.ee$/.test(h);
    } catch (e) { return false; }
  }
  /* Lấy mã cửa hàng và mã sản phẩm từ link Shopee; trả về link gọn, bỏ phần theo dõi của người khác */
  function productUrl(link) {
    try {
      var u = new URL(link);
      if (!/(^|\.)shopee\.vn$/i.test(u.hostname)) return "";
      var m = u.pathname.match(/-i\.(\d{1,12})\.(\d{1,15})(?:\/|$)/) || u.pathname.match(/\/product\/(\d{1,12})\/(\d{1,15})(?:\/|$)/);
      return m ? "https://shopee.vn/product/" + m[1] + "/" + m[2] : "";
    } catch (e) { return ""; }
  }
  function affLink(link, code) {
    var t = C.shopeeDeeplink || "";
    if (/^https:\/\//.test(t) && t.indexOf("{url}") >= 0) return t.split("{url}").join(encodeURIComponent(link)).split("{sub}").join(encodeURIComponent(code));
    var id = String(C.shopeeAffiliateId || "").trim(), p = productUrl(link); /* dùng mã tiếp thị liên kết của cửa hàng */
    if (!/^\d{5,20}$/.test(id) || !p) return "";
    return "https://s.shopee.vn/an_redir?origin_link=" + encodeURIComponent(p) + "&affiliate_id=" + id + "&sub_id=" + encodeURIComponent(code);
  }
  var AUTO = !!(C.shopeeAuto || /^\d{5,20}$/.test(String(C.shopeeAffiliateId || "").trim()));
  function autoLink(code, phone) { /* hỏi máy chủ link tiếp thị của khách (máy chủ giữ khóa Shopee) */
    return fetch("/api/aff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code, phone: phone }) })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { return j && j.link ? j.link : ""; }, function () { return ""; });
  }
  var LABEL = { "Mới": "Đã tiếp nhận yêu cầu", "Đã gửi link": "Đã có link mua hàng", "Khách báo đã mua": "Đã nhận thông tin đơn hàng, chờ Shopee đối soát", "Chờ đối soát": "Đang chờ Shopee đối soát hoa hồng", "Đã có hoa hồng": "Shopee đã xác nhận, chờ chuyển tiền cho bạn", "Đã hoàn tiền": "Đã hoàn tiền", "Không đủ điều kiện": "Không đủ điều kiện hoàn tiền" };
  function openBtn(url) { return '<a class="btn" href="' + esc(url) + '" target="_blank" rel="noopener sponsored nofollow">Mở Shopee để mua</a>'; }

  function initCashback() {
    var pct = +C.cashbackPercent || 50;
    Array.prototype.forEach.call(document.querySelectorAll("[data-pct]"), function (e) { e.textContent = pct; });
    var f1 = $("cf1"), f2 = $("cf2"), f3 = $("cf3");
    f1.addEventListener("submit", async function (e) {
      e.preventDefault();
      var out = $("cm1"), f = new FormData(f1);
      if (f.get("website")) return;
      var name = field(f, "name", 80), phone = field(f, "phone", 15), link = field(f, "link", 580);
      if (!/^0\d{9}$/.test(phone)) return msg(out, "Số điện thoại cần đủ 10 chữ số, bắt đầu bằng 0.", true);
      if (!isShopee(link)) return msg(out, "Link chưa đúng. Hãy dán link sản phẩm lấy từ ứng dụng hoặc trang shopee.vn (bắt đầu bằng https://).", true);
      if (!ON) return msg(out, 'Tính năng này cần kết nối cơ sở dữ liệu. Bạn vui lòng nhắn link qua <a href="' + ZALO + '" target="_blank" rel="noopener">Zalo</a> nhé.', true);
      var b = f1.querySelector("button"); b.disabled = true;
      try {
        var code = "", done = false;
        for (var t = 0; t < 3 && !done; t++) {
          code = "HT" + rand(6);
          var r = await api("/rest/v1/cashback", { json: { code: code, name: name, phone: phone, shopee_link: link }, headers: { Prefer: "return=minimal" } });
          if (r.ok) done = true; else if (r.status !== 409) await fail("insert", r);
        }
        if (!done) throw new Error("code");
        hook({ id: code, name: name, phone: phone, addr: "(Hoàn tiền Shopee)", note: "Yêu cầu hoàn tiền Shopee", total: 0, items: ["[Hoàn tiền Shopee] " + link] });
        var aff = affLink(link, code);
        if (!aff && AUTO) { msg(out, "✅ Đã tạo yêu cầu. <b>Mã của bạn: " + code + "</b>. Đang tạo link mua hàng cho bạn…"); aff = await autoLink(code, phone); }
        msg(out, "✅ Đã tạo yêu cầu. <b>Mã của bạn: " + code + "</b> (hãy lưu lại cùng số điện thoại để tra cứu).<br>" +
          (aff ? "Bấm nút dưới đây để mở Shopee và mua hàng <b>ngay trong lần bấm này</b>:<br><br>" + openBtn(aff)
               : "Chúng tôi sẽ gửi <b>link mua hàng riêng</b> cho bạn qua điện thoại hoặc Zalo. Bạn cũng có thể tra cứu bằng mã ở mục 3 bên dưới."));
        f1.reset();
      } catch (err) { msg(out, 'Chưa tạo được yêu cầu, bạn thử lại hoặc nhắn qua <a href="' + ZALO + '" target="_blank" rel="noopener">Zalo</a> nhé.' + why(err), true); }
      finally { b.disabled = false; }
    });
    f2.addEventListener("submit", async function (e) {
      e.preventDefault();
      var out = $("cm2"), f = new FormData(f2);
      if (f.get("website")) return;
      var code = field(f, "code", 20).toUpperCase(), phone = field(f, "phone", 15);
      if (!ON) return msg(out, "Tính năng này cần kết nối cơ sở dữ liệu.", true);
      var b = f2.querySelector("button"); b.disabled = true;
      try {
        var r = await api("/rest/v1/rpc/cashback_claim", { json: { p_code: code, p_phone: phone, p_order_id: field(f, "order", 60), p_bank_name: field(f, "bank", 60), p_bank_no: field(f, "acc", 30), p_bank_owner: field(f, "owner", 80) } });
        var ok = r.ok ? await r.json() : false;
        if (ok === true) { msg(out, "✅ Đã nhận thông tin đơn hàng và tài khoản nhận tiền. Chúng tôi sẽ hoàn tiền sau khi Shopee xác nhận hoa hồng. Bạn có thể tra cứu tiến độ ở mục 3."); f2.reset(); }
        else msg(out, "Không tìm thấy yêu cầu khớp với mã và số điện thoại này, hoặc yêu cầu đã được xử lý. Bạn kiểm tra lại giúp nhé.", true);
      } catch (err) { msg(out, "Chưa gửi được, bạn thử lại sau nhé.", true); }
      finally { b.disabled = false; }
    });
    f3.addEventListener("submit", async function (e) {
      e.preventDefault();
      var out = $("cm3"), f = new FormData(f3);
      if (f.get("website")) return;
      if (!ON) return msg(out, "Tính năng này cần kết nối cơ sở dữ liệu.", true);
      var b = f3.querySelector("button"); b.disabled = true;
      try {
        var r = await api("/rest/v1/rpc/cashback_lookup", { json: { p_code: field(f, "code", 20).toUpperCase(), p_phone: field(f, "phone", 15) } });
        var rows = r.ok ? await r.json() : [];
        if (!rows.length) return msg(out, "Không tìm thấy yêu cầu khớp mã và số điện thoại. Bạn kiểm tra lại giúp nhé.", true);
        var x = rows[0], link = x.aff_link || affLink(x.shopee_link, x.code);
        if (!link && AUTO && (x.status === "Mới" || x.status === "Đã gửi link")) link = await autoLink(x.code, field(f, "phone", 15));
        var h = "<b>Mã " + esc(x.code) + "</b><br>Tình trạng: <b>" + esc(LABEL[x.status] || x.status) + "</b>";
        if (x.order_id) h += "<br>Mã đơn Shopee: " + esc(x.order_id);
        if (x.cashback > 0) h += "<br>Số tiền hoàn cho bạn: <b>" + vnd(x.cashback) + "</b> (" + x.percent + "% hoa hồng)";
        if (x.paid_at) h += "<br>Đã chuyển ngày " + new Date(x.paid_at).toLocaleDateString("vi-VN");
        if (link && (x.status === "Mới" || x.status === "Đã gửi link")) h += "<br><br>" + openBtn(link);
        msg(out, h);
      } catch (err) { msg(out, "Chưa tra cứu được, bạn thử lại sau nhé.", true); }
      finally { b.disabled = false; }
    });
  }

  if (page === "photo" && $("pf")) initPhoto();
  if (page === "cashback" && $("cf1")) initCashback();
  if (typeof module !== "undefined") module.exports = { isShopee: isShopee, affLink: affLink, rand: rand };
})();
