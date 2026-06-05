const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('score-val');
const levelVal = document.getElementById('level-val');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const gameTitle = document.getElementById('game-title');
const gameDesc = document.getElementById('game-desc');

// Pengaturan Konfigurasi Game
const CENTER_X = canvas.width / 2;
const CENTER_Y = canvas.height / 2;
const PLAYER_DISTANCE = 40;
const PLAYER_SIZE = 8;

let score = 0;
let level = 1;
let gameOver = false;
let gameActive = false;
let animationId = null;

let playerAngle = 0; 
let obstacles = [];
let spawnTimer = 0;
let spawnInterval = 90; // Frame per kemunculan dinding (semakin kecil, semakin rapat)
let baseSpeed = 2.5;

// Deteksi Input Keyboard
const keys = { ArrowLeft: false, ArrowRight: false };

window.addEventListener('keydown', (e) => {
    if (e.key in keys) keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key in keys) keys[e.key] = false;
});

// Class untuk Dinding Pemblokir (Rintangan)
class HexWall {
    constructor(speed) {
        this.radius = Math.max(canvas.width, canvas.height);
        this.speed = speed;
        // Memilih secara acak 1 sampai 2 sisi yang kosong dari total 6 sisi hexagon
        this.openSides = [];
        const count = Math.random() > 0.6 ? 2 : 1;
        while (this.openSides.length < count) {
            const side = Math.floor(Math.random() * 6);
            if (!this.openSides.includes(side)) {
                this.openSides.push(side);
            }
        }
        this.color = `hsl(${(level * 40) % 360}, 100%, 50%)`;
    }

    update() {
        this.radius -= this.speed;
    }

    draw() {
        ctx.lineWidth = 6;
        ctx.strokeStyle = this.color;
        
        for (let i = 0; i < 6; i++) {
            // Lewati penggambaran garis jika sisi ini adalah jalur aman yang kosong
            if (this.openSides.includes(i)) continue;

            const angle1 = (i * Math.PI) / 3;
            const angle2 = ((i + 1) * Math.PI) / 3;

            const x1 = CENTER_X + Math.cos(angle1) * this.radius;
            const y1 = CENTER_Y + Math.sin(angle1) * this.radius;
            const x2 = CENTER_X + Math.cos(angle2) * this.radius;
            const y2 = CENTER_Y + Math.sin(angle2) * this.radius;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    checkCollision(pAngle) {
        // Normalisasi sudut pemain antara 0 sampai 2*PI
        let normalizedAngle = pAngle % (Math.PI * 2);
        if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;

        // Tentukan sisi mana yang sedang ditempati pemain (0 - 5)
        const playerSide = Math.floor(normalizedAngle / (Math.PI / 3)) % 6;

        // Jika radius dinding berada di area jarak pemain, periksa tabrakan
        if (this.radius >= PLAYER_DISTANCE - 5 && this.radius <= PLAYER_DISTANCE + 5) {
            if (!this.openSides.includes(playerSide)) {
                return true; // Menabrak dinding solid
            }
        }
        return false;
    }
}

function initGame() {
    score = 0;
    level = 1;
    baseSpeed = 2.5;
    spawnInterval = 90;
    playerAngle = 0;
    obstacles = [];
    spawnTimer = 0;
    gameOver = false;
    gameActive = true;

    scoreVal.textContent = score;
    levelVal.textContent = level;
    overlay.classList.remove('visible');
    
    if (animationId) cancelAnimationFrame(animationId);
    loop();
}

function triggerGameOver() {
    gameOver = true;
    gameActive = false;
    cancelAnimationFrame(animationId);

    gameTitle.textContent = "GAME OVER";
    gameTitle.style.color = "#ff0055";
    gameTitle.style.textShadow = "0 0 15px #ff0055";
    gameDesc.innerHTML = `Anda bertahan hingga <b>LEVEL ${level}</b> dengan total skor <b>${score}</b>.`;
    startBtn.textContent = "MAIN LAGI";
    overlay.classList.add('visible');
}

function loop() {
    if (!gameActive) return;

    // 1. Bersihkan Layar Efek Fade Out Grid
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Gambar Struktur Pusat Otomatis Berputar Pelan
    ctx.strokeStyle = '#222233';
    ctx.lineWidth = 1;
    for(let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(CENTER_X, CENTER_Y);
        ctx.lineTo(CENTER_X + Math.cos(a) * canvas.width, CENTER_Y + Math.sin(a) * canvas.width);
        ctx.stroke();
    }

    // 3. Pergerakan Posisi Pemain (Kecepatan Rotasi Tinggi)
    const rotationSpeed = 0.07;
    if (keys.ArrowLeft) playerAngle -= rotationSpeed;
    if (keys.ArrowRight) playerAngle += rotationSpeed;

    // 4. Proses Logika Spawning Rintangan Hexagon
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
        obstacles.push(new HexWall(baseSpeed));
        spawnTimer = 0;
        
        // Mekanisme Peningkatan Kesulitan Bertahap secara Real-time
        score += 10;
        scoreVal.textContent = score;

        if (score % 50 === 0) {
            level++;
            levelVal.textContent = level;
            baseSpeed += 0.4; // Dinding menyusut lebih cepat
            spawnInterval = Math.max(45, spawnInterval - 6); // Jarak antar dinding memendek
        }
    }

    // 5. Update dan Gambar Semua Dinding Rintangan
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        obstacles[i].draw();

        // Cek deteksi tabrakan
        if (obstacles[i].checkCollision(playerAngle)) {
            triggerGameOver();
            return;
        }

        // Hapus objek jika sudah menyusut melewati titik tengah
        if (obstacles[i].radius <= 10) {
            obstacles.splice(i, 1);
            score += 5;
            scoreVal.textContent = score;
        }
    }

    // 6. Gambar Karakter Pemain (Segitiga Neon)
    const pX = CENTER_X + Math.cos(playerAngle) * PLAYER_DISTANCE;
    const pY = CENTER_Y + Math.sin(playerAngle) * PLAYER_DISTANCE;

    ctx.save();
    ctx.translate(pX, pY);
    ctx.rotate(playerAngle);
    
    ctx.fillStyle = '#00ffcc';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffcc';
    
    ctx.beginPath();
    ctx.moveTo(PLAYER_SIZE * 1.5, 0);
    ctx.lineTo(-PLAYER_SIZE, -PLAYER_SIZE);
    ctx.lineTo(-PLAYER_SIZE, PLAYER_SIZE);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 7. Gambar Core Core Pentagonal Tengah
    ctx.fillStyle = '#111';
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for(let i=0; i<=6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.lineTo(CENTER_X + Math.cos(a)*20, CENTER_Y + Math.sin(a)*20);
    }
    ctx.fill();
    ctx.stroke();

    animationId = requestAnimationFrame(loop);
}

// Event Listener Tombol Mulai
startBtn.addEventListener('click', initGame);
