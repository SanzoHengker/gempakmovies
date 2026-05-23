import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    deleteDoc, 
    getDocs, 
    collection, 
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Menggunakan Firebase Config milik kau
const firebaseConfig = {
  apiKey: "AIzaSyD2Kgd8uYeNtmiZ-5ufFLq-DOQN7BgEOQY",
  authDomain: "gempakmovies-ac6b1.firebaseapp.com",
  projectId: "gempakmovies-ac6b1",
  storageBucket: "gempakmovies-ac6b1.firebasestorage.app",
  messagingSenderId: "961597764617",
  appId: "1:961597764617:web:1b49580f02fd5263c874d8"
};

// Initialize Firebase, Auth & Firestore
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variabel Penjejak Sesi & Status Semasa
let isKandunganSiriTV = false;
let paparanSemasa = "movies"; // "movies", "tv", atau "watchlist"
let userSemasaId = null;
let itemAktifModal = null; // Menyimpan data item yang sedang dibuka di modal

// SEKATAN KESELAMATAN & PROFIL PENGGUNA
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'auth.html';
    } else {
        userSemasaId = user.uid;
        
        // Papar maklumat profil pengguna
        document.getElementById('user-email-display').innerText = user.email;
        if(user.metadata.creationTime) {
            const tarikhDaftar = new Date(user.metadata.creationTime).toLocaleDateString('ms-MY');
            document.getElementById('user-joined-display').innerText = `Daftar: ${tarikhDaftar}`;
        }
        
        // Set paparan awal
        tukarKandunganUtama("movies");
    }
});

// LOGIK LOG KELUAR
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'auth.html';
    });
});

// LOGIK DROPDOWN PROFIL
const profileBtn = document.getElementById('profile-btn');
const profileMenu = document.getElementById('profile-menu');
profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle('show');
});
window.addEventListener('click', () => {
    if (profileMenu.classList.contains('show')) {
        profileMenu.classList.remove('show');
    }
});

// --- API TMDB & STREAMING URL ---
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzYjZjZjg4YzIxMjBiNTk5ODdiYjI5ZWU4MThjYWI4MyIsIm5iZiI6MTc3OTUxMTU0Ny45NDEsInN1YiI6IjZhMTEzMGZiMWYyNDVkOWE2ODRiNDc3OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QshCr1EhnIf-M6acv3Y-iEwwx0IYwtt1DJnMStEOOX4'; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// Server streaming berbeza mengikut jenis (Movie / TV)
const STREAM_MOVIE_URL = 'https://vidsrc.to/embed/movie/';
const STREAM_TV_URL = 'https://vidsrc.to/embed/tv/';

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
const watchlistBtn = document.getElementById('modal-watchlist-btn');

const options = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${TMDB_TOKEN}`
    }
};

// Pengurusan Penukaran Tab Navigasi
document.getElementById('tab-movies').addEventListener('click', () => tukarKandunganUtama("movies"));
document.getElementById('tab-tv').addEventListener('click', () => tukarKandunganUtama("tv"));
document.getElementById('tab-watchlist').addEventListener('click', () => tukarKandunganUtama("watchlist"));

function tukarKandunganUtama(jenis) {
    paparanSemasa = jenis;
    searchInput.value = '';
    
    // Kemas kini kelas aktif pada elemen tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    
    if (jenis === "movies") {
        document.getElementById('tab-movies').classList.add('active');
        titleDisplay.innerText = "Filem Popular Hari Ini";
        isKandunganSiriTV = false;
        muatDataTMDB('/movie/popular');
    } else if (jenis === "tv") {
        document.getElementById('tab-tv').classList.add('active');
        titleDisplay.innerText = "Siri TV Popular Hari Ini";
        isKandunganSiriTV = true;
        muatDataTMDB('/tv/popular');
    } else if (jenis === "watchlist") {
        document.getElementById('tab-watchlist').classList.add('active');
        titleDisplay.innerText = "Senarai Watchlist Anda";
        muatWatchlistUser();
    }
}

// Fungsi menarik data global dari TMDB
async function muatDataTMDB(path) {
    const url = `${TMDB_BASE_URL}${path}?language=en-US&page=1`;
    try {
        const respon = await fetch(url, options);
        const data = await respon.json();
        paparkanKandungan(data.results);
    } catch (ralat) {
        console.error("Gagal memuatkan data TMDB:", ralat);
    }
}

// Fungsi render kad data ke grid HTML
function paparkanKandungan(senaraiItem) {
    movieGrid.innerHTML = ''; 

    if (!senaraiItem || senaraiItem.length === 0) {
        movieGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #666;">Tiada kandungan ditemui.</p>`;
        return;
    }

    senaraiItem.forEach(item => {
        // Siri TV menggunakan 'name' & 'first_air_date', manakala Filem menggunakan 'title' & 'release_date'
        const tajuk = item.title || item.name;
        const tarikh = item.release_date || item.first_air_date;
        const id = item.id;
        const isTvItem = item.isTv !== undefined ? item.isTv : isKandunganSiriTV; // Ambil nilai asal jika dari watchlist

        const gambarPoster = item.poster_path ? IMG_URL + item.poster_path : 'https://via.placeholder.com/500x750?text=Tiada+Poster';
        const tahunLancar = tarikh ? tarikh.split('-')[0] : 'N/A';
        const ratingSkor = item.vote_average ? item.vote_average.toFixed(1) : '0.0';

        const kad = document.createElement('div');
        kad.classList.add('movie-card');
        
        kad.innerHTML = `
            <img class="movie-poster" src="${gambarPoster}" alt="${tajuk}" loading="lazy">
            <div class="movie-info">
                <div class="movie-name" title="${tajuk}">${tajuk}</div>
                <div class="movie-meta">
                    <span>${tahunLancar} (${isTvItem ? 'TV' : 'Movie'})</span>
                    <span class="movie-rating">★ ${ratingSkor}</span>
                </div>
            </div>
        `;

        // Klik kad untuk buka pemain video
        kad.addEventListener('click', () => {
            bukaModalKandungan(item, isTvItem, tajuk, tahunLancar, ratingSkor, gambarPoster);
        });
        
        movieGrid.appendChild(kad);
    });
}

// Fungsi membuka modal pop-up berserta kemas kini status kegemaran/watchlist
async function bukaModalKandungan(item, isTvItem, tajuk, tahunLancar, ratingSkor, poster) {
    itemAktifModal = {
        id: item.id.toString(),
        title: tajuk,
        release_date: item.release_date || item.first_air_date || '',
        vote_average: item.vote_average || 0,
        poster_path: item.poster_path || '',
        overview: item.overview || '',
        isTv: isTvItem
    };

    // Pautkan URL server streaming berasaskan kategori jenis kandungan
    if (isTvItem) {
        // Untuk siri TV, vidsrc.to menyokong format /tv/{id}/1/1 (Season 1 Episode 1 secara lalai)
        videoPlayer.src = `${STREAM_TV_URL}${item.id}/1/1`;
    } else {
        videoPlayer.src = `${STREAM_MOVIE_URL}${item.id}`;
    }

    modalTitle.innerText = tajuk;
    modalYear.innerText = `Tahun: ${tahunLancar}`;
    modalRating.innerText = `★ ${ratingSkor}`;
    modalOverview.innerText = item.overview ? item.overview : "Tiada sinopsis disediakan.";
    
    // Semak sekiranya item ini sudah wujud dalam Firestore watchlist milik user
    await kemaskiniIkonButangWatchlist();

    movieModal.style.display = 'flex';
}

// Logik semakan dan penukaran ikon/teks butang watchlist
async function kemaskiniIkonButangWatchlist() {
    if (!userSemasaId || !itemAktifModal) return;
    
    try {
        const q = query(collection(db, "watchlist"), where("userId", "==", userSemasaId), where("id", "==", itemAktifModal.id));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            watchlistBtn.innerHTML = `<i class="fa-solid fa-bookmark" style="color: #e50914;"></i> Di Dalam Watchlist`;
            watchlistBtn.classList.add('active');
        } else {
            watchlistBtn.innerHTML = `<i class="fa-regular fa-bookmark"></i> Tambah Watchlist`;
            watchlistBtn.classList.remove('active');
        }
    } catch (r) {
        console.error("Ralat semakan dokumen watchlist:", r);
    }
}

// Klik butang tambah/buang kegemaran dalam modal
watchlistBtn.addEventListener('click', async () => {
    if (!userSemasaId || !itemAktifModal) return;

    const docId = `${userSemasaId}_${itemAktifModal.id}`;
    const targetDocRef = doc(db, "watchlist", docId);
    
    if (watchlistBtn.classList.contains('active')) {
        // Proses padam kandungan dari Firestore
        try {
            await deleteDoc(targetDocRef);
            alert("Kandungan dikeluarkan daripada senarai watchlist anda.");
            await kemaskiniIkonButangWatchlist();
            
            // Jika user sedang berada di tab watchlist, refresh paparan terus secara live
            if (paparanSemasa === "watchlist") muatWatchlistUser();
        } catch (r) {
            alert("Gagal memadam dokumen.");
        }
    } else {
        // Proses simpan kandungan baru ke Firestore
        try {
            await setDoc(targetDocRef, {
                userId: userSemasaId,
                id: itemAktifModal.id,
                title: itemAktifModal.title,
                release_date: itemAktifModal.release_date,
                vote_average: itemAktifModal.vote_average,
                poster_path: itemAktifModal.poster_path,
                overview: itemAktifModal.overview,
                isTv: itemAktifModal.isTv
            });
            alert("Kandungan berjaya disimpan ke watchlist anda!");
            await kemaskiniIkonButangWatchlist();
        } catch (r) {
            alert("Ralat kegagalan storan database.");
        }
    }
});

// Fungsi menarik data watchlist dari Cloud Firestore database
async function muatWatchlistUser() {
    movieGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #aaa;">Memuatkan data senarai kegemaran...</p>';
    try {
        const q = query(collection(db, "watchlist"), where("userId", "==", userSemasaId));
        const snapshot = await getDocs(q);
        const dataWatchlist = [];
        
        snapshot.forEach(doc => {
            dataWatchlist.push(doc.data());
        });
        
        paparkanKandungan(dataWatchlist);
    } catch (ralat) {
        console.error("Gagal menarik rekod database:", ralat);
    }
}

// Fungsi menutup modal pemain video
function tutupModal() {
    movieModal.style.display = 'none';
    videoPlayer.src = ''; 
    itemAktifModal = null;
}
closeModalBtn.addEventListener('click', tutupModal);
window.addEventListener('click', (e) => {
    if (e.target === movieModal) { tutupModal(); }
});

// FUNGSI DEBOUNCE UNTUK SISTEM CARIAN GLOBAL
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// Logik operasi carian bersepadu (Filem & Siri TV bergantung pada tab yang aktif)
const prosesCarian = async (e) => {
    const kataKunci = e.target.value.trim();

    if (kataKunci && kataKunci !== '') {
        titleDisplay.innerText = `Hasil Carian untuk: "${kataKunci}"`;
        
        // Pilih jenis endpoint TMDB mengikut jenis kandungan tab semasa
        const endpointCarian = isKandunganSiriTV ? '/search/tv' : '/search/movie';
        const urlCarian = `${TMDB_BASE_URL}${endpointCarian}?query=${encodeURIComponent(kataKunci)}&language=en-US&page=1`;
        
        try {
            const respon = await fetch(urlCarian, options);
            const data = await respon.json();
            paparkanKandungan(data.results);
        } catch (ralat) {
            console.error("Gagal memproses fungsi carian:", ralat);
        }
    } else {
        // Jika input kosong, kembalikan ke tetapan paparan asal tab
        tukarKandunganUtama(paparanSemasa);
    }
};

searchInput.addEventListener('keyup', debounce(prosesCarian, 500));