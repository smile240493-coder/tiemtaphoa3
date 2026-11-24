/* Game rắn săn mồi: dùng phím mũi tên, WASD, vuốt màn hình hoặc nút điều hướng */
(function () {
  var N = 20;
  var DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  function placeFood(s, rnd) {
    var free = [];
    for (var x = 0; x < N; x++) for (var y = 0; y < N; y++)
      if (!s.snake.some(function (p) { return p.x === x && p.y === y; })) free.push({ x: x, y: y });
    return free.length ? free[Math.floor(rnd() * free.length)] : null;
  }
  function newState(rnd) {
    var s = { snake: [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }], dir: DIRS.right, next: DIRS.right, score: 0, dead: false, food: null };
    s.food = placeFood(s, rnd);
    return s;
  }
  function turn(s, d) { if (d.x === -s.dir.x && d.y === -s.dir.y) return s; s.next = d; return s; }
  function step(s, rnd) {
    if (s.dead) return s;
    s.dir = s.next;
    var h = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
    if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N) { s.dead = true; return s; }
    var eat = !!s.food && h.x === s.food.x && h.y === s.food.y;
    var body = eat ? s.snake : s.snake.slice(0, -1);
    if (body.some(function (p) { return p.x === h.x && p.y === h.y; })) { s.dead = true; return s; }
    s.snake.unshift(h);
    if (eat) { s.score++; s.food = placeFood(s, rnd); if (!s.food) s.dead = true; } else s.snake.pop();
    return s;
  }
  function init() {
    var $ = function (id) { return document.getElementById(id); };
    var cv = $("cv"), ctx = cv.getContext("2d"), cell = cv.width / N;
    var s = newState(Math.random), timer = null, running = false, paused = false;
    var KEY = "game_snake_best";
    var best = function () { try { return +localStorage.getItem(KEY) || 0; } catch (e) { return 0; } };
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill(); }
    function draw() {
      ctx.fillStyle = "#eef2fb"; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = "#e3e9f6";
      for (var x = 0; x < N; x++) for (var y = 0; y < N; y++) if ((x + y) % 2) ctx.fillRect(x * cell, y * cell, cell, cell);
      if (s.food) { ctx.fillStyle = "#e11d2e"; ctx.beginPath(); ctx.arc((s.food.x + .5) * cell, (s.food.y + .5) * cell, cell * .38, 0, 6.2832); ctx.fill(); }
      s.snake.forEach(function (p, i) { ctx.fillStyle = i === 0 ? "#10306b" : "#1f4fd8"; rr(p.x * cell + 1, p.y * cell + 1, cell - 2, cell - 2, 5); });
      $("sc").textContent = s.score; $("bs").textContent = best();
    }
    function over() {
      running = false;
      if (s.score > best()) { try { localStorage.setItem(KEY, String(s.score)); } catch (e) {} }
      draw(); $("ms").hidden = false;
      $("ms").innerHTML = "Hết lượt! Bạn ăn được <b>" + s.score + "</b> mồi. Bấm <b>Chơi lại</b> để thử lần nữa.";
      $("st").textContent = "Chơi lại";
    }
    function loop() {
      if (!running || paused) return;
      step(s, Math.random); draw();
      if (s.dead) { over(); return; }
      timer = setTimeout(loop, Math.max(65, 140 - s.score * 3));
    }
    function start() {
      clearTimeout(timer); s = newState(Math.random); running = true; paused = false;
      $("ms").hidden = true; $("ps").textContent = "Tạm dừng"; $("st").textContent = "Chơi lại";
      draw(); timer = setTimeout(loop, 300);
    }
    function pause() {
      if (!running) return;
      paused = !paused; $("ps").textContent = paused ? "Tiếp tục" : "Tạm dừng";
      if (!paused) loop();
    }
    function go(d) { if (!running) return; turn(s, d); }
    var KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
    document.addEventListener("keydown", function (e) {
      if (KEYS[e.key]) { if (running) e.preventDefault(); go(DIRS[KEYS[e.key]]); }
      else if (e.key === " " || e.key === "p") { if (running) e.preventDefault(); pause(); }
    });
    var tx = 0, ty = 0;
    cv.addEventListener("touchstart", function (e) { var t = e.touches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
    cv.addEventListener("touchend", function (e) {
      var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.right : DIRS.left) : (dy > 0 ? DIRS.down : DIRS.up));
    }, { passive: true });
    Array.prototype.forEach.call(document.querySelectorAll("[data-d]"), function (b) {
      b.addEventListener("click", function () { go(DIRS[b.dataset.d]); });
    });
    $("st").addEventListener("click", start);
    $("ps").addEventListener("click", pause);
    document.addEventListener("visibilitychange", function () { if (document.hidden && running && !paused) pause(); });
    draw();
  }
  if (typeof module !== "undefined") module.exports = { N: N, DIRS: DIRS, newState: newState, turn: turn, step: step, placeFood: placeFood };
  if (typeof document !== "undefined") init();
})();
