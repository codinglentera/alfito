const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('score-val');
const levelVal = document.getElementById('level-val');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const gameTitle = document.getElementById('game-title');
const gameDesc = document.getElementById('game-desc');

// Konfigurasi Dasar Game
const CENTER_X = canvas.width / 2;
const CENTER_Y = canvas.height / 2;
const PLAYER_DISTANCE = 45; // Sedikit dijauhkan agar sudut potong lebih ketat
const PLAYER_SIZE = 7;

let score = 0;
let level = 1;
let gameOver = false;
let gameActive = false;
let animationId = null;

let playerAngle = 0; 
let obstacles = [];
let spawnTimer = 0;

// MODAL EXTREME: Variabel Rotasi Kamera Dunia
let worldRotation = 0;
let worldRotationSpeed = 0.015; 
let worldRotationDirection = 1;

// SETTING EXTREME: Kecepatan awal gila dan jeda sangat rapat
let spawnInterval = 50; 
let baseSpeed = 5.0;

// Deteksi Input Keyboard
const keys = { ArrowLeft: false, ArrowRight: false };

window.addEventListener('keydown', (e) => {
    if (e.key in keys) keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key in keys) keys[e.key] = false;
});

// Class Dinding Rintangan Hexagon
class HexWall {
    constructor(speed) {
        this.radius = Math.max(canvas.width, canvas.height);
        this.speed = speed;
        
        // EXTREME: Hanya 1 sisi yang terbuka (jalur aman sangat sempit!)
        this.openSides = [Math.floor(Math.random() * 6)];
        
        // Warna neon acak per dinding agar visual semakin mendistraksi
        this.color = `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
    }

    update() {
        this.radius -= this.speed;
    }

    draw() {
        ctx.lineWidth = 8; // Dinding lebih tebal
        ctx.strokeStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        for (let i = 0; i < 6; i++) {
            if (this.openSides.includes(i)) continue;

            const angle1 = (i * Math.PI) / 3;
            const angle2 = ((i + 1) * Math.PI) / 3;

            const x1 = Math.cos(angle1) * this.radius;
            const y1 = Math.sin(angle1) * this.radius;
            const x2 = Math.cos(angle2) * this.radius;
            const y2 = Math.sin(angle2) * this.radius;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        ctx.shadowBlur = 0; // Reset efek neon setelah menggambar rintangan
    }

    checkCollision(pAngle) {
        let normalizedAngle = pAngle % (Math.PI * 2);
        if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;

        const playerSide = Math.floor(normalizedAngle / (Math.PI / 3)) % 6;

        // Toleransi benturan ketat
        if (this.radius >= PLAYER_DISTANCE - 6 && this.radius <= PLAYER_DISTANCE + 6) {
            if (!this.openSides.includes(playerSide)) {
                return true; 
            }
        }
        return false;
    }
}

function initGame() {
    score = 0;
    level = 1;
    baseSpeed = 5.0;     // Kecepatan awal ekstrim
    spawnInterval = 50;  // Jeda awal sangat rapat
    playerAngle = 0;
    obstacles = [];
    spawnTimer = 0;
    worldRotation = 0;
    worldRotationSpeed = 0.015;
    gameOver = false;
    gameActive = true;

    scoreVal.textContent = score;
    levelVal.textContent = level;
    
    // Ubah tampilan UI kontainer menjadi merah membara
    document.getElementById('game-container').style.borderColor = '#ff0055';
    document.getElementById('game-container').style.boxShadow = '0 0 30px #ff0055';
    
    overlay.classList.remove('visible');
    
    if (animationId) cancelAnimationFrame(animationId);
    loop();
}

function triggerGameOver() {
    gameOver = true;
    gameActive = false;
    cancelAnimationFrame(animationId);

    gameTitle.textContent = "EXTREME CRASHED";
    gameTitle.style.color = "#ff0000";
    gameTitle.style.textShadow = "0 0 25px #ff0000";
    gameDesc.innerHTML = `Mati di <b>LEVEL ${level}</b><br>Skor Akhir: <span style="color:#00ffcc; font-size:24px;"><b>${score}</b></span>`;
    startBtn.textContent = "COBA LAGI (MODE EXTREME)";
    overlay.classList.add('visible');
}

function loop() {
    if (!gameActive) return;

    // 1. Efek Jejak Buram (Motion Blur)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // EXTREME: Manipulasi Kamera Menggunakan Transformasi Matriks (Screen Spin)
    ctx.save();
    ctx.translate(CENTER_X, CENTER_Y);
    
    // Update arah putaran kamera global secara berkala
    worldRotation += worldRotationSpeed * worldRotationDirection;
    ctx.rotate(worldRotation);

    // 2. Gambar Garis Sumbu Latar Belakang
    ctx.strokeStyle = '#111122';
    ctx.lineWidth = 1;
    for(let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * canvas.width, Math.sin(a) * canvas.width);
        ctx.stroke();
    }

    // 3. Kontrol Pergerakan Pemain
    const rotationSpeed = 0.085; // Gerakan pemain dipercepat untuk mengimbangi rintangan
    if (keys.ArrowLeft) playerAngle -= rotationSpeed;
    if (keys.ArrowRight) playerAngle += rotationSpeed;

    // 4. Logika Spawn Rintangan Jarak Dekat
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
        obstacles.push(new HexWall(baseSpeed));
        spawnTimer = 0;
        
        score += 20; // Poin naik lebih cepat
        scoreVal.textContent = score;

        // Naik Level Setiap 100 Poin
        if (score % 100 === 0) {
            level++;
            levelVal.textContent = level;
            
            // EXTREME: Kecepatan bertambah agresif
            baseSpeed += 0.6; 
            spawnInterval = Math.max(25, spawnInterval - 4); 
            
            // Mengubah arah putaran layar secara acak saat naik level
            worldRotationDirection = Math.random() > 0.5 ? 1 : -1;
            worldRotationSpeed += 0.005; 

            // Efek Glitch Flash Visual
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-CENTER_X, -CENTER_Y, canvas.width, canvas.height);
        }
    }

    // 5. Update, Render, dan Cek Tabrakan Rintangan
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        obstacles[i].draw();

        if (obstacles[i].checkCollision(playerAngle)) {
            ctx.restore(); // Kembalikan matriks sebelum keluar fungsi
            triggerGameOver();
            return;
        }

        if (obstacles[i].radius <= 8) {
            obstacles.splice(i, 1);
            score += 10;
            scoreVal.textContent = score;
        }
    }

    // 6. Menggambar Pemain Berbentuk Segitiga Presisi
    const pX = Math.cos(playerAngle) * PLAYER_DISTANCE;
    const pY = Math.sin(playerAngle) * PLAYER_DISTANCE;

    ctx.save();
    ctx.translate(pX, pY);
    ctx.rotate(playerAngle);
    
    ctx.fillStyle = '#00ffcc';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00ffcc';
    
    ctx.beginPath();
    ctx.moveTo(PLAYER_SIZE * 1.6, 0);
    ctx.lineTo(-PLAYER_SIZE, -PLAYER_SIZE);
    ctx.lineTo(-PLAYER_SIZE, PLAYER_SIZE);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 7. Core Pemutus Tengah Segi Enam
    ctx.fillStyle = '#050505';
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff0055';
    ctx.beginPath();
    for(let i=0; i<=6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
    }
    ctx.fill();
    ctx.stroke();

    // Kembalikan konteks transformasi matriks layar agar UI tidak ikut berputar
    ctx.restore();

    animationId = requestAnimationFrame(loop);
}

// Inisialisasi awal tombol pemicu game
startBtn.addEventListener('click', initGame);
