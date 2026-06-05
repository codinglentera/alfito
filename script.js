// Kumpulan kata acak pilihan untuk lomba mengetik
const daftarKata = [
    "teknologi", "komputer", "program", "javascript", "logika",
    "koding", "belajar", "internet", "aplikasi", "jaringan",
    "memori", "database", "sistem", "informasi", "kecepatan",
    "akurat", "tantangan", "bermain", "semangat", "sukses"
];

const kataTarget = document.getElementById('kata-target');
const inputKata = document.getElementById('input-kata');
const waktuVal = document.getElementById('waktu-val');
const skorVal = document.getElementById('skor-val');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');

let skor = 0;
let waktu = 10; // Durasi awal dalam detik
let hitungMundur = null;
let gameAktif = false;

// Fungsi untuk mengambil kata acak dari daftar
function acakKata() {
    const indeksAcak = Math.floor(Math.random() * daftarKata.length);
    kataTarget.textContent = daftarKata[indeksAcak];
}

// Fungsi memulai permainan baru
function mulaiGame() {
    skor = 0;
    waktu = 10;
    gameAktif = true;

    skorVal.textContent = skor;
    waktuVal.textContent = waktu;
    inputKata.value = '';
    
    overlay.classList.remove('visible');
    acakKata();
    
    // Pastikan kotak input langsung siap diketik tanpa perlu diklik manual
    setTimeout(() => inputKata.focus(), 50);

    // Jalankan timer hitung mundur setiap 1 detik (1000 milidetik)
    clearInterval(hitungMundur);
    hitungMundur = setInterval(updateTimer, 1000);
}

// Fungsi memperbarui sisa waktu permainan
function updateTimer() {
    waktu--;
    waktuVal.textContent = waktu;

    if (waktu <= 0) {
        clearInterval(hitungMundur);
        gameAktif = false;
        triggerGameOver();
    }
}

// Fungsi memicu kondisi Game Over ketika waktu habis
function triggerGameOver() {
    overlayTitle.textContent = "WAKTU HABIS!";
    overlayTitle.style.color = "#f43f5e";
    overlayDesc.innerHTML = `Lomba selesai!<br>Total skor kecepatan mengetik Anda: <b style="color:#10b981; font-size: 1.5rem;">${skor}</b>`;
    startBtn.textContent = "COBA LAGI";
    overlay.classList.add('visible');
}

// Deteksi input ketikan dari pemain secara real-time
inputKata.addEventListener('input', () => {
    if (!gameAktif) return;

    const teksKetik = inputKata.value.trim().toLowerCase();
    const teksTarget = kataTarget.textContent.toLowerCase();

    // Jika kata yang diketik cocok 100% dengan target
    if (teksKetik === teksTarget) {
        skor++;
        skorVal.textContent = skor;
        
        // Bersihkan kotak input untuk kata selanjutnya
        inputKata.value = '';
        
        // Berikan bonus tambahan waktu +2 detik per kata benar agar bisa bertahan lebih lama
        waktu += 2;
        waktuVal.textContent = waktu;
        
        // Ganti ke kata baru
        acakKata();
    }
});

// Jalankan fungsi saat tombol klik diakses
startBtn.addEventListener('click', mulaiGame);
