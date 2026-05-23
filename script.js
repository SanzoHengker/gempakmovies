import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Menggunakan Firebase Config milik kau
const firebaseConfig = {
  apiKey: "AIzaSyD2Kgd8uYeNtmiZ-5ufFLq-DOQN7BgEOQY",
  authDomain: "gempakmovies-ac6b1.firebaseapp.com",
  projectId: "gempakmovies-ac6b1",
  storageBucket: "gempakmovies-ac6b1.firebasestorage.app",
  messagingSenderId: "961597764617",
  appId: "1:961597764617:web:1b49580f02fd5263c874d8"
};

// Initialize Firebase & Auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// SEKATAN KESELAMATAN: Jika user belum log masuk, hantar balik ke auth.html
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'auth.html';
    } else {
        // Hanya muat kandungan asal sekiranya user disahkan aktif
        dapatkanFilemPopular();
    }
});

// LOGIK LOG KELUAR (LOG OUT)
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        alert('Anda telah berjaya log keluar.');
        window.location.href = 'auth.html';
    }).catch((error) => {
        console.error("Gagal log keluar:", error);
    });
});

// --- KONFIGURASI DAN LOGIK UTAMA DATA TMDB ---
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzYjZjZjg4YzIxMjBiNTk5ODdiYjI5ZWU4MThjYWI4MyIsIm5iZiI6MT7OTUxMTU0Ny45NDEsInN1YiI6IjZhMTEzMGZiMWYyNDVkOWE2ODRiNDc3OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QshCr1EhnIf-M6acv3Y-iEwwx0IYwtt1DJnMStEOOX4'; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const STREAM_SERVER_URL = 'https://vidsrc.to/embed/movie/';

const movieGrid = document.getElementById('movie-grid');
const searchInput = document.getElementById('search');
const titleDisplay = document.getElementById('title-display');

// Elemen Modal & Player
const movieModal = document.getElementById('movie-modal');
const closeModalBtn = document.getElementById('close-modal');
const videoPlayer = document.getElementById('video-player');
const modalTitle = document.getElementById('modal-title');
const modalYear = document.getElementById('modal-year');
const modalRating = document.getElementById('modal-rating');
const modalOverview = document.getElementById('modal-overview');

const options = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${TMDB_TOKEN}`
    }
};

// Fungsi dapatkan filem popular dari TMDB
async function dapatkanFilemPopular() {
    const url = `${TMDB_BASE_URL}/movie/popular?language=en-US&page=1`;
    try {
        const respon = await fetch(url, options);
        const data = await respon.json();
        paparkanFilem(data.results);
    } catch (ralat) {
        console.error("Gagal memuatkan data filem:", ralat);
    }
}

// Fungsi memaparkan senarai filem pada grid HTML
function paparkanFilem(filemList) {
    movieGrid.innerHTML = ''; 

    if (!filemList || filemList.length === 0) {
        movieGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #666;">Filem tidak ditemui.</p>`;
        return;
    }

    filemList.forEach(filem => {
        const { id, title, poster_path, vote_average, release_date } = filem;
        
        const gambarPoster = poster_path ? IMG_URL + poster_path : 'https://via.placeholder.com/500x750?text=Tiada+Poster';
        const tahunLancar = release_date ? release_date.split('-')[0] : 'N/A';
        const ratingSkor = vote_average ? vote_average.toFixed(1) : '0.0';

        const kadFilem = document.createElement('div');
        kadFilem.classList.add('movie-card');
        
        kadFilem.innerHTML = `
            <img class="movie-poster" src="${gambarPoster}" alt="${title}" loading="lazy">
            <div class="movie-info">
                <div class="movie-name" title="${title}">${title}</div>
                <div class="movie-meta">
                    <span>${tahunLancar}</span>
                    <span class="movie-rating">★ ${ratingSkor}</span>
                </div>
            </div>
        `;

        // Event klik untuk membuka video player di dalam modal pop-up
        kadFilem.addEventListener('click', () => {
            videoPlayer.src = `${STREAM_SERVER_URL}${id}`; 
            modalTitle.innerText = title;
            modalYear.innerText = `Tahun: ${tahunLancar}`;
            modalRating.innerText = `★ ${ratingSkor}`;
            modalOverview.innerText = filem.overview ? filem.overview : "Tiada sinopsis disediakan.";
            
            movieModal.style.display = 'flex';
        });
        
        movieGrid.appendChild(kadFilem);
    });
}

// Fungsi menutup modal & menghentikan fungsi main video
function tutupModal() {
    movieModal.style.display = 'none';
    videoPlayer.src = ''; 
}

closeModalBtn.addEventListener('click', tutupModal);
window.addEventListener('click', (e) => {
    if (e.target === movieModal) { tutupModal(); }
});

// Fungsi Debounce untuk menghadkan kekerapan API request semasa menaip carian
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// Logik proses carian filem
const prosesCarian = async (e) => {
    const kataKunci = e.target.value.trim();

    if (kataKunci && kataKunci !== '') {
        titleDisplay.innerText = `Hasil Carian untuk: "${kataKunci}"`;
        const urlCarian = `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(kataKunci)}&language=en-US&page=1`;
        
        try {
            const respon = await fetch(urlCarian, options);
            const data = await respon.json();
            paparkanFilem(data.results);
        } catch (ralat) {
            console.error("Gagal melakukan carian filem:", ralat);
        }
    } else {
        titleDisplay.innerText = "Filem Popular Hari Ini";
        dapatkanFilemPopular();
    }
};

// Menggunakan debounce pada input carian dengan penangguhan masa 500ms
searchInput.addEventListener('keyup', debounce(prosesCarian, 500));