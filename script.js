const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('score-val');
const speedVal = document.getElementById('speed-val');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const title = document.getElementById('title');
const desc = document.getElementById('desc');

// Variabel Kontrol Permainan
let score = 0;
let gameSpeed = 4.5; 
let gameActive = false;
let animationId = null;
let obstacles = [];
let spawnTimer = 0;
let spawnInterval = 75; 

// Fisika Pesawat (Inersia Tinggi / Sangat Licin)
const player = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    width: 30,
    height: 30,
    vx: 0,            // Kecepatan horizontal saat ini
    acceleration: 0.7,// Akselerasi per frame
    friction: 0.92,   // Efek gesekan rem alami (semakin mendekati 1, semakin licin)
    maxSpeed: 9       // Batas kecepatan maksimum
};

const keys = { ArrowLeft: false, ArrowRight: false };

window.addEventListener('keydown', (e) => {
    if (e.key in keys) keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key in keys) keys[e.key] = false;
});

// Class Rintangan Celah Dinding Bergerak
class ObstacleRow {
    constructor(speed) {
        this.y = -40;
        this.height = 30;
        this.speed = speed;
        
        // Menghitung lebar celah aman secara dinamis berdasarkan tingkat skor
        this.gateWidth = Math.max(75, 150 - Math.floor(score * 0.4));
        
        // Memilih titik tengah celah aman secara acak
        this.gateX = Math.floor(Math.random() * (canvas.width - this.gateWidth - 60)) + 30;
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.fillStyle = '#ff0055';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0055';

        // Blok rintangan bagian kiri sebelum celah aman
        ctx.fillRect(0, this.y, this.gateX, this.height);
        
        // Blok rintangan bagian kanan setelah celah aman
        const rightX = this.gateX + this.gateWidth;
        ctx.fillRect(rightX, this.y, canvas.width - rightX, this.height);
        
        ctx.shadowBlur = 0; // Reset efek glow
    }

    checkCollision(p) {
        // Cek apakah koordinat Y pesawat bersinggungan dengan baris balok
        if (p.y < this.y + this.height && p.y + p.height > this.y) {
            // Jika pesawat TIDAK berada di dalam batas celah aman, maka terjadi tabrakan
            if (p.x < this.gateX || p.x + p.width > this.gateX + this.gateWidth) {
                return true;
            }
        }
        return false;
    }
}

function initGame() {
    score = 0;
    gameSpeed = 4.5;
    spawnInterval = 75;
    obstacles = [];
    spawnTimer = 0;
    
    player.x = canvas.width / 2 - player.width / 2;
    player.vx = 0;
    
    scoreVal.textContent = score;
    speedVal.textContent = (gameSpeed / 4.5).toFixed(1);
    overlay.classList.remove('visible');
    
    gameActive = true;
    if (animationId) cancelAnimationFrame(animationId);
    loop();
}

function triggerGameOver() {
    gameActive = false;
    cancelAnimationFrame(animationId);

    title.textContent = "QUANTUM CRASHED";
    title.style.color = "#ff0055";
    desc.innerHTML = `Sistem hancur total.<br>Skor Evakuasi: <span style="color:#00ffcc; font-size:24px;"><b>${score}</b></span>`;
    startBtn.textContent = "REBOOT SIMULASI";
    overlay.classList.add('visible');
}

function loop() {
    if (!gameActive) return;

    // 1. Membersihkan Layar dengan Efek Transparansi untuk Motion Blur
    ctx.fillStyle = 'rgba(10, 10, 25, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Kalkulasi Fisika Gerakan Inersia Pesawat
    if (keys.ArrowLeft) {
        player.vx -= player.acceleration;
    }
    if (keys.ArrowRight) {
        player.vx += player.acceleration;
    }

    // Terapkan hambatan fiksi dan batasi kecepatan maksimal
    player.vx *= player.friction;
    player.vx = Math.max(-player.maxSpeed, Math.min(player.maxSpeed, player.vx));
    
    // Perbarui posisi koordinat X pesawat
    player.x += player.vx;

    // Batasi agar pesawat tidak keluar dari dinding pembatas canvas kiri/kanan
    if (player.x < 0) {
        player.x = 0;
        player.vx = 0;
    }
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
        player.vx = 0;
    }

    // 3. Logika Penambahan Rintangan Baru secara Berkala
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
        obstacles.push(new ObstacleRow(gameSpeed));
        spawnTimer = 0;

        // Tingkatkan kecepatan game dan perkecil jeda spawn secara konstan
        gameSpeed += 0.15;
        spawnInterval = Math.max(35, spawnInterval - 1);
        speedVal.textContent = (gameSpeed / 4.5).toFixed(1);
    }

    // 4. Perbarui Posisi, Gambar, dan Deteksi Tabrakan Setiap Rintangan
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        obstacles[i].draw();

        if (obstacles[i].checkCollision(player)) {
            triggerGameOver();
            return;
        }

        // Jika rintangan sudah keluar dari batas bawah layar canvas
        if (obstacles[i].y > canvas.height) {
            obstacles.splice(i, 1);
            score += 10;
            scoreVal.textContent = score;
        }
    }

    // 5. Menggambar Karakter Pesawat Segitiga Neon Cyberspace
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    
    // Memberikan kemiringan visual halus pada model pesawat berdasarkan arah kecepatan momentum
    ctx.rotate(player.vx * 0.03); 

    ctx.fillStyle = '#00ffcc';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffcc';
    
    ctx.beginPath();
    ctx.moveTo(0, -player.height / 2);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.lineTo(player.width / 2, player.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    animationId = requestAnimationFrame(loop);
}

startBtn.addEventListener('click', initGame);
