/* Cờ ca-rô 3x3 (ba ô thẳng hàng) đấu với máy */
(function () {
  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  var other = function (p) { return p === "X" ? "O" : "X"; };
  function winner(b) {
    for (var i = 0; i < LINES.length; i++) { var l = LINES[i]; if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return b[l[0]]; }
    return b.every(Boolean) ? "draw" : null;
  }
  function minimax(b, p, me) {
    var w = winner(b);
    if (w === me) return 1;
    if (w === "draw") return 0;
    if (w) return -1;
    var best = p === me ? -2 : 2;
    for (var i = 0; i < 9; i++) if (!b[i]) {
      b[i] = p; var s = minimax(b, other(p), me); b[i] = null;
      best = p === me ? Math.max(best, s) : Math.min(best, s);
    }
    return best;
  }
  function bestMove(b, me) {
    var bi = -1, bs = -2;
    for (var i = 0; i < 9; i++) if (!b[i]) {
      b[i] = me; var s = minimax(b, other(me), me); b[i] = null;
      if (s > bs) { bs = s; bi = i; }
    }
    return bi;
  }
  function randomMove(b, rnd) {
    var e = []; b.forEach(function (v, i) { if (!v) e.push(i); });
    return e.length ? e[Math.floor(rnd() * e.length)] : -1;
  }
  function pick(b, level, rnd) {
    if (level === "easy") return randomMove(b, rnd);
    if (level === "mid") return rnd() < 0.5 ? bestMove(b, "O") : randomMove(b, rnd);
    return bestMove(b, "O");
  }
  function init() {
    var $ = function (id) { return document.getElementById(id); };
    var b, busy = false, done = false, tally = { win: 0, lose: 0, draw: 0 };
    function render() {
      $("bd").innerHTML = b.map(function (v, i) {
        return '<button type="button" class="tc' + (v ? " " + v : "") + '" data-i="' + i + '" aria-label="Ô ' + (i + 1) + (v ? ": " + v : "") + '"' + (v || done ? " disabled" : "") + ">" + (v || "") + "</button>";
      }).join("");
      $("w").textContent = tally.win; $("l").textContent = tally.lose; $("d").textContent = tally.draw;
    }
    function say(h) { $("ms").hidden = !h; if (h) $("ms").innerHTML = h; }
    function finish() {
      var w = winner(b);
      if (!w) return false;
      done = true;
      if (w === "X") { tally.win++; say("🎉 Bạn thắng!"); }
      else if (w === "O") { tally.lose++; say("Máy thắng ván này. Thử lại nhé!"); }
      else { tally.draw++; say("Hòa! Một ván cân tài cân sức."); }
      render(); return true;
    }
    function reset() { b = Array(9).fill(null); busy = false; done = false; say(""); render(); }
    $("bd").addEventListener("click", function (e) {
      var c = e.target && e.target.closest ? e.target.closest("[data-i]") : null;
      if (!c || busy || done) return;
      var i = +c.dataset.i;
      if (b[i]) return;
      b[i] = "X"; render();
      if (finish()) return;
      busy = true;
      setTimeout(function () {
        var m = pick(b, $("lv").value, Math.random);
        if (m >= 0) b[m] = "O";
        busy = false; render(); finish();
      }, 350);
    });
    $("nw").addEventListener("click", reset);
    reset();
  }
  if (typeof module !== "undefined") module.exports = { winner: winner, bestMove: bestMove, randomMove: randomMove, minimax: minimax, pick: pick };
  if (typeof document !== "undefined") init();
})();
