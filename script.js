// Geometry Dash - like prototype (single-file logic separated)
// Save as game.js and include with <script src="game.js" defer></script>

(() => {
  // Canvas & DPI
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const CSS_W = 900, CSS_H = 450;
  function fitCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.style.width = CSS_W + 'px';
    canvas.style.height = CSS_H + 'px';
    canvas.width = Math.floor(CSS_W * dpr);
    canvas.height = Math.floor(CSS_H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  // Game constants
  const GROUND_Y = CSS_H - 90;
  const GRAVITY = 2000; // px/s^2
  const JUMP_VELOCITY = -680; // px/s
  const PLAYER_SIZE = 48;
  const SCROLL_START = 360; // speed px/s initial
  const SPEED_INC = 0.005; // per meter/distance
  const OB_MIN_GAP = 180;
  const OB_MAX_GAP = 420;
  const OB_MIN_W = 20;
  const OB_MAX_W = 70;

  // State
  let running = false;
  let lastTime = 0;
  let scrollSpeed = 360;
  let distance = 0; // used as score (meters)
  let obstacles = [];
  let particles = [];
  let rngSeed = Math.random()*1000;

  // Player
  const player = {
    x: 140,
    y: GROUND_Y - PLAYER_SIZE,
    vy: 0,
    w: PLAYER_SIZE,
    h: PLAYER_SIZE,
    grounded: true,
    alive: true,
    rotation: 0 // for small tilt effect
  };

  // UI
  const startBtn = document.getElementById('startBtn');
  const scoreEl = document.getElementById('score');
  const infoEl = document.getElementById('info');
  const muteBtn = document.getElementById('muteBtn');
  let muted = false;
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.textContent = 'Suara: ' + (muted ? 'OFF' : 'ON');
  });

  startBtn.addEventListener('click', () => {
    if (!running) startGame();
    else resetGame();
  });

  // Input (space, click, touch)
  let inputLocked = false;
  function doJump() {
    if (!running) { startGame(); return; }
    if (!player.alive) return;
    // allow coyote time & single jump
    if (player.grounded || (player.vy > 0 && player.y > GROUND_Y - PLAYER_SIZE - 14)) {
      player.vy = JUMP_VELOCITY;
      player.grounded = false;
      spawnJumpParticles(player.x + player.w*0.5, player.y + player.h);
      // small sound (web audio optional) - omitted if muted
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      doJump();
    }
  });
  canvas.addEventListener('mousedown', (e) => {
    doJump();
  });
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    doJump();
  }, {passive:false});

  // Obstacles generator
  function rand(a,b){ return a + Math.random()*(b-a); }
  function addObstacle(x) {
    const w = rand(OB_MIN_W, OB_MAX_W);
    const h = rand(36, 110);
    const y = GROUND_Y - h;
    obstacles.push({ x, w, h, y });
  }

  function ensureObstacles() {
    // ensure there is always obstacle ahead
    const last = obstacles.length ? obstacles[obstacles.length - 1] : null;
    const spawnX = CSS_W + 80;
    if (!last) {
      addObstacle(spawnX + rand(0, 260));
      return;
    }
    const gap = rand(OB_MIN_GAP, OB_MAX_GAP) - Math.min(scrollSpeed*0.2, 200);
    if (last.x + last.w + gap < CSS_W + 300) {
      addObstacle(last.x + last.w + gap);
    }
  }

  // Collision AABB
  function rectsOverlap(a, b) {
    return !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);
  }

  // Particles for feedback
  function spawnJumpParticles(x,y) {
    for (let i=0;i<12;i++){
      particles.push({
        x: x + rand(-8,8), y: y + rand(-4,4),
        vx: rand(-120,120), vy: rand(-200, -60),
        life: rand(300,700), age:0, r: rand(1.5,3), color: `255,200,80`
      });
    }
  }
  function spawnDeathParticles(x,y) {
    for (let i=0;i<32;i++){
      particles.push({
        x, y,
        vx: rand(-520,520), vy: rand(-520,520),
        life: rand(400,1100), age:0, r: rand(2,6), color: `255,110,80`
      });
    }
  }

  // Game controls
  function startGame(){
    // reset
    obstacles = [];
    particles = [];
    scrollSpeed = SCROLL_START;
    distance = 0;
    player.x = 140;
    player.y = GROUND_Y - PLAYER_SIZE;
    player.vy = 0;
    player.grounded = true;
    player.alive = true;
    running = true;
    lastTime = 0;
    startBtn.textContent = 'Restart';
    infoEl.textContent = 'Berlari... Tekan/klik untuk meloncat';
    ensureObstacles();
  }

  function resetGame(){
    startGame();
  }

  function gameOver(){
    player.alive = false;
    running = false;
    infoEl.textContent = 'Kamu menabrak! Tekan Mulai untuk coba lagi';
    spawnDeathParticles(player.x + player.w/2, player.y + player.h/2);
  }

  // Update loop
  function update(dt){
    if (!running) {
      // still update particles to keep visuals
      updateParticles(dt);
      return;
    }

    // increase distance & speed
    distance += scrollSpeed * dt;
    scrollSpeed += SPEED_INC * dt * 1000; // small continual increase

    // move obstacles (scroll)
    for (let ob of obstacles) {
      ob.x -= scrollSpeed * dt;
    }
    // remove off-screen obstacles
    obstacles = obstacles.filter(o => o.x + o.w > -50);

    ensureObstacles();

    // player physics
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;

    // ground collision
    if (player.y + player.h >= GROUND_Y) {
      player.y = GROUND_Y - player.h;
      player.vy = 0;
      player.grounded = true;
    } else {
      player.grounded = false;
    }

    // tilt effect
    player.rotation = Math.max(-0.35, Math.min(0.35, player.vy / 1200));

    // collision with obstacles
    const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };
    for (let ob of obstacles) {
      const obRect = { x: ob.x, y: ob.y, w: ob.w, h: ob.h };
      if (rectsOverlap(pRect, obRect)) {
        gameOver();
        break;
      }
    }

    updateParticles(dt);
    // update score display
    scoreEl.textContent = 'Jarak: ' + Math.floor(distance);
  }

  function updateParticles(dt){
    for (let i = particles.length -1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt*1000;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // gravity slightly
      p.vy += 600 * dt;
      p.vx *= 0.995;
      if (p.age >= p.life) particles.splice(i,1);
    }
  }

  // Draw functions
  function draw(){
    // clear
    ctx.clearRect(0,0,CSS_W,CSS_H);

    // background gradient sky
    const sky = ctx.createLinearGradient(0,0,0,CSS_H);
    sky.addColorStop(0, '#071427');
    sky.addColorStop(1, '#031026');
    ctx.fillStyle = sky;
    ctx.fillRect(0,0,CSS_W,CSS_H);

    // parallax mountains / shapes
    drawParallax();

    // ground
    ctx.fillStyle = '#0f2230';
    ctx.fillRect(0, GROUND_Y, CSS_W, CSS_H - GROUND_Y);

    // dashed road lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -((distance/6)%40); i < CSS_W; i += 40) {
      ctx.moveTo(i, GROUND_Y + 44);
      ctx.lineTo(i+24, GROUND_Y + 44);
    }
    ctx.stroke();

    // obstacles
    for (let ob of obstacles) {
      // draw spike / block
      ctx.fillStyle = '#ff5e57';
      ctx.fillRect(Math.round(ob.x), ob.y, ob.w, ob.h);
      // top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(Math.round(ob.x), ob.y, ob.w, 6);
    }

    // player (square) with small rotation
    ctx.save();
    ctx.translate(player.x + player.w/2, player.y + player.h/2);
    ctx.rotate(player.rotation);
    // body
    const grad = ctx.createLinearGradient(-player.w/2, -player.h/2, player.w/2, player.h/2);
    grad.addColorStop(0, '#ffd86b');
    grad.addColorStop(1, '#ff8a4e');
    ctx.fillStyle = grad;
    ctx.fillRect(-player.w/2, -player.h/2, player.w, player.h);
    // border
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-player.w/2, -player.h/2, player.w, player.h);
    ctx.restore();

    // particles
    for (let p of particles) {
      const t = 1 - (p.age / p.life);
      ctx.globalAlpha = Math.max(0, Math.min(1, t));
      ctx.fillStyle = `rgba(${p.color}, ${0.9})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.6 + t), 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // HUD overlays (distance already updated)
    // if not running show overlay
    if (!running) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0,0,CSS_W,CSS_H);
      ctx.fillStyle = '#fff';
      ctx.font = '24px Inter, Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Tekan Space / Klik / Tap untuk meloncat', CSS_W/2, CSS_H/2 - 12);
      ctx.textAlign = 'start';
    }
  }

  function drawParallax(){
    // simple moving hills
    const t = performance.now() / 1000;
    // far
    ctx.fillStyle = '#071a2a';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y - 40);
    for (let x=0; x <= CSS_W; x+=20) {
      const y = GROUND_Y - 60 - Math.sin((x/120) + t*0.4)*12;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(CSS_W, GROUND_Y+10);
    ctx.lineTo(0, GROUND_Y+10);
    ctx.closePath();
    ctx.fill();

    // mid
    ctx.fillStyle = '#0b2b3a';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y - 12);
    for (let x=0; x <= CSS_W; x+=30) {
      const y = GROUND_Y - 24 - Math.cos((x/80) + t*0.8)*8;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(CSS_W, GROUND_Y+10);
    ctx.lineTo(0, GROUND_Y+10);
    ctx.closePath();
    ctx.fill();
  }

  // Main loop
  function loop(ts){
    if (!lastTime) lastTime = ts;
    const dt = Math.min(0.04, (ts - lastTime) / 1000);
    lastTime = ts;

    // update & draw
    update(dt);
    draw();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // spawn obstacles regularly (initial fill)
  function initObstacles() {
    obstacles = [];
    let x = CSS_W + 40;
    for (let i=0;i<6;i++){
      const w = rand(OB_MIN_W, OB_MAX_W);
      const gap = rand(OB_MIN_GAP, OB_MAX_GAP);
      addObstacle(x);
      x += w + gap;
    }
  }
  initObstacles();

})();
