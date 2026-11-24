/* Game 2048: ghép các ô giống nhau để đạt 2048 */
(function () {
  function slideRow(row) {
    var a = row.filter(function (v) { return v; }), score = 0;
    for (var i = 0; i < a.length - 1; i++) if (a[i] === a[i + 1]) { a[i] *= 2; score += a[i]; a.splice(i + 1, 1); }
    while (a.length < 4) a.push(0);
    return { row: a, score: score };
  }
  function move(board, dir) {
    var b = board.map(function (r) { return r.slice(); }), score = 0, moved = false;
    var horiz = dir === "left" || dir === "right", rev = dir === "right" || dir === "down";
    var get = function (i) { return horiz ? b[i].slice() : b.map(function (r) { return r[i]; }); };
    for (var i = 0; i < 4; i++) {
      var line = get(i), old = line.slice();
      if (rev) line.reverse();
      var r = slideRow(line), out = r.row;
      if (rev) out = out.slice().reverse();
      score += r.score;
      if (out.some(function (v, k) { return v !== old[k]; })) moved = true;
      if (horiz) b[i] = out; else for (var k = 0; k < 4; k++) b[k][i] = out[k];
    }
    return { board: b, score: score, moved: moved };
  }
  function addTile(b, rnd) {
    var e = [];
    b.forEach(function (r, y) { r.forEach(function (v, x) { if (!v) e.push([x, y]); }); });
    if (!e.length) return b;
    var p = e[Math.floor(rnd() * e.length)];
    b[p[1]][p[0]] = rnd() < 0.9 ? 2 : 4;
    return b;
  }
  function canMove(b) { return ["left", "right", "up", "down"].some(function (d) { return move(b, d).moved; }); }
  function newBoard(rnd) { var b = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]; addTile(b, rnd); addTile(b, rnd); return b; }
  function maxTile(b) { return Math.max.apply(null, b.map(function (r) { return Math.max.apply(null, r); })); }
  function init() {
    var $ = function (id) { return document.getElementById(id); };
    var b, score = 0, won = false, over = false;
    var KEY = "game_2048_best";
    var best = function () { try { return +localStorage.getItem(KEY) || 0; } catch (e) { return 0; } };
    function render() {
      $("bd").innerHTML = b.map(function (r) { return r.map(function (v) { return '<div class="t t' + (v > 2048 ? "big" : v) + '">' + (v || "") + "</div>"; }).join(""); }).join("");
      $("sc").textContent = score; $("bs").textContent = best();
    }
    function say(h) { $("ms").hidden = !h; if (h) $("ms").innerHTML = h; }
    function reset() { b = newBoard(Math.random); score = 0; won = false; over = false; say(""); render(); }
    function go(dir) {
      if (over) return;
      var r = move(b, dir);
      if (!r.moved) return;
      b = r.board; score += r.score; addTile(b, Math.random);
      if (score > best()) { try { localStorage.setItem(KEY, String(score)); } catch (e) {} }
      render();
      if (!won && maxTile(b) >= 2048) { won = true; say("🎉 Bạn đã đạt <b>2048</b>! Tiếp tục chơi để lấy điểm cao hơn."); }
      else if (!canMove(b)) { over = true; say("Hết nước đi! Điểm của bạn: <b>" + score + "</b>. Bấm <b>Chơi lại</b> để thử lần nữa."); }
    }
    var KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
    document.addEventListener("keydown", function (e) { if (KEYS[e.key]) { e.preventDefault(); go(KEYS[e.key]); } });
    var tx = 0, ty = 0, bd = $("bd");
    bd.addEventListener("touchstart", function (e) { var t = e.touches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
    bd.addEventListener("touchend", function (e) {
      var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    }, { passive: true });
    $("nw").addEventListener("click", reset);
    reset();
  }
  if (typeof module !== "undefined") module.exports = { slideRow: slideRow, move: move, addTile: addTile, canMove: canMove, newBoard: newBoard, maxTile: maxTile };
  if (typeof document !== "undefined") init();
})();
