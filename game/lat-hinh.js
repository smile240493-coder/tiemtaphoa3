/* Game lật hình: tìm đủ 8 cặp thẻ giống nhau */
(function () {
  var ICONS = ["📱", "🎧", "🔌", "⌚", "🍳", "🧹", "🌀", "🎁"];
  function makeDeck(rnd) {
    var d = ICONS.concat(ICONS).map(function (v, i) { return { id: i, v: v, open: false, done: false }; });
    for (var i = d.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = d[i]; d[i] = d[j]; d[j] = t; }
    return d;
  }
  function newState(rnd) { return { deck: makeDeck(rnd), first: null, lock: false, pending: null, moves: 0, matched: 0 }; }
  function flip(s, i) {
    var c = s.deck[i];
    if (s.lock || c.open || c.done) return s;
    c.open = true;
    if (s.first === null) { s.first = i; return s; }
    s.moves++;
    var a = s.deck[s.first];
    if (a.v === c.v) { a.done = c.done = true; s.matched++; s.first = null; }
    else { s.pending = [s.first, i]; s.lock = true; s.first = null; }
    return s;
  }
  function settle(s) {
    if (s.pending) { s.pending.forEach(function (i) { s.deck[i].open = false; }); s.pending = null; s.lock = false; }
    return s;
  }
  function init() {
    var $ = function (id) { return document.getElementById(id); };
    var st, t0 = 0, timer = null;
    var KEY = "game_lat_best";
    var best = function () { try { return +localStorage.getItem(KEY) || 0; } catch (e) { return 0; } };
    var fmt = function (s) { return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
    function render() {
      $("bd").innerHTML = st.deck.map(function (c, i) {
        var show = c.open || c.done;
        return '<button type="button" class="mc' + (c.open ? " on" : "") + (c.done ? " done" : "") + '" data-i="' + i + '" aria-label="' + (show ? c.v : "Thẻ úp " + (i + 1)) + '">' + (show ? c.v : "?") + "</button>";
      }).join("");
      $("mv").textContent = st.moves;
      $("bs").textContent = best() ? best() + " lượt" : "–";
    }
    function reset() {
      clearInterval(timer); timer = null; t0 = 0;
      st = newState(Math.random);
      $("ms").hidden = true; $("tm").textContent = "0:00";
      render();
    }
    $("bd").addEventListener("click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("[data-i]") : null;
      if (!b) return;
      if (!t0) { t0 = Date.now(); timer = setInterval(function () { $("tm").textContent = fmt(Math.floor((Date.now() - t0) / 1000)); }, 500); }
      flip(st, +b.dataset.i); render();
      if (st.pending) setTimeout(function () { settle(st); render(); }, 750);
      if (st.matched === ICONS.length) {
        clearInterval(timer);
        var sec = Math.floor((Date.now() - t0) / 1000), b0 = best();
        if (!b0 || st.moves < b0) { try { localStorage.setItem(KEY, String(st.moves)); } catch (e2) {} }
        $("tm").textContent = fmt(sec); render();
        $("ms").hidden = false;
        $("ms").innerHTML = "🎉 Chúc mừng! Bạn hoàn thành sau <b>" + st.moves + " lượt</b> trong <b>" + fmt(sec) + "</b>. <a href=\"/san-pham\">Xem sản phẩm của Tiệm Tạp Hóa</a>";
      }
    });
    $("nw").addEventListener("click", reset);
    reset();
  }
  if (typeof module !== "undefined") module.exports = { ICONS: ICONS, makeDeck: makeDeck, newState: newState, flip: flip, settle: settle };
  if (typeof document !== "undefined") init();
})();
