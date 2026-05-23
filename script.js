// CONFIGURASI API TMDB (TOKEN DAN KEY ANDA)
const API_KEY = '3b6cf88c2120b59987bb29ee818cab83'; 
const API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzYjZjZjg4YzIxMjBiNTk5ODdiYjI5ZWU4MThjYWI4MyIsIm5iZiI6MTc3OTUxMTU0Ny45NDEsInN1YiI6IjZhMTEzMGZiMWYyNDVkOWE2ODRiNDc3OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QshCr1EhnIf-M6acv3Y-iEwwx0IYwtt1DJnMStEOOX4';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

// Menggunakan Server Embed Asal (vidsrc.me dikekalkan untuk kestabilan)
const MOVIE_EMBED_URL = 'https://vidsrc.me/embed/movie/'; 
const TV_EMBED_URL = 'https://vidsrc.me/embed/tv/';       

// Tetapan Headers Token API Read Access
const fetchOptions = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${API_TOKEN}`
    }
};

// Elemen-Elemen DOM
const movieGrid = document.getElementById('movie-grid');
const movieModal = document.getElementById('movie-modal');
const closeModal = document.getElementById('close-modal');
const videoPlayer = document.getElementById('video-player');
const modalTitle = document.getElementById('modal-title');
const modalYear = document.getElementById('modal-year');
const modalRating = document.getElementById('modal-rating');
const modalOverview = document.getElementById('modal-overview');
const searchInput = document.getElementById('search');

// Tab-tab Navigasi
const tabMovies = document.getElementById('tab-movies');
const tabTv = document.getElementById('tab-tv');
const tabWatchlist = document.getElementById('tab-watchlist');
const titleDisplay = document.getElementById('title-display');

// Dropdown Profil
const profileBtn = document.getElementById('profile-btn');
const profileMenu = document.getElementById('profile-menu');

let currentTab = 'movie'; // lalai asal: movie

/* ==========================================
   LOGIK MENU DROPDOWN PROFIL
   ========================================== */
if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileMenu.classList.toggle('show');
    });
    document.addEventListener('click', () => {
        profileMenu.classList.remove('show');
    });
}

/* ==========================================
   MENDAPATKAN DATA LIVE DARI TMDB
   ========================================== */

// Ambil data senarai popular dari TMDB (LIVE)
async function fetchContent(type) {
    let endpoint = type === 'movie' ? '/movie/popular' : '/tv/popular';
    try {
        const response = await fetch(`${BASE_URL}${endpoint}?language=ms-MY&page=1`, fetchOptions);
        const data = await response.json();
        renderGrid(data.results, type);
    } catch (error) {
        console.error("Gagal mendapatkan kandungan:", error);
    }
}

// Fungsi Carian Live
async function searchContent(query) {
    if (!query) {
        fetchContent(currentTab);
        return;
    }
    let endpoint = currentTab === 'movie' ? '/search/movie' : '/search/tv';
    try {
        const response = await fetch(`${BASE_URL}${endpoint}?query=${encodeURIComponent(query)}&language=ms-MY&page=1`, fetchOptions);
        const data = await response.json();
        renderGrid(data.results, currentTab);
    } catch (error) {
        console.error("Gagal melakukan carian:", error);
    }
}

// Bina senarai kad dalam grid halaman utama
function renderGrid(items, type) {
    movieGrid.innerHTML = '';
    if (!items || items.length === 0) {
        movieGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#666;">Tiada kandungan ditemui.</p>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('movie-card');
        
        const posterSrc = item.poster_path ? `${IMAGE_URL}${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster';
        const titleText = item.title || item.name;
        const releaseDate = item.release_date || item.first_air_date || '';
        const year = releaseDate ? releaseDate.substring(0, 4) : 'N/A';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : '0.0';

        card.innerHTML = `
            <img class="movie-poster" src="${posterSrc}" alt="${titleText}" loading="lazy">
            <div class="movie-info">
                <div class="movie-name" title="${titleText}">${titleText}</div>
                <div class="movie-meta">
                    <span>${year}</span>
                    <span class="movie-rating">★ ${rating}</span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            openModal(item, type);
        });
        
        movieGrid.appendChild(card);
    });
}

/* ==========================================
   LOGIK MODAL PLAYER ASAL (TANPA LOGIK EPISOD)
   ========================================== */
function openModal(item, type) {
    movieModal.style.display = 'flex';
    modalTitle.textContent = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date || '';
    modalYear.textContent = releaseDate ? releaseDate.substring(0, 4) : 'N/A';
    modalRating.textContent = `★ ${item.vote_average ? item.vote_average.toFixed(1) : '0.0'}`;
    modalOverview.textContent = item.overview || 'Tiada sinopsis disediakan.';

    // Berdasarkan jenis kandungan, terus muatkan video ke dalam iframe secara ringkas
    if (type === 'tv') {
        videoPlayer.src = `${TV_EMBED_URL}${item.id}`;
    } else {
        videoPlayer.src = `${MOVIE_EMBED_URL}${item.id}`;
    }
}

/* ==========================================
   EVENT LISTENERS KAWALAN MODAL & NAV
   ========================================== */

if (closeModal) {
    closeModal.addEventListener('click', () => {
        movieModal.style.display = 'none';
        videoPlayer.src = ''; 
    });
}
window.addEventListener('click', (e) => {
    if (e.target === movieModal) {
        movieModal.style.display = 'none';
        videoPlayer.src = '';
    }
});

// Carian Debounce
let searchTimeout;
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchContent(e.target.value.trim());
        }, 500);
    });
}

// Logik Pertukaran Tab Menu Navigasi Utama
if (tabMovies && tabTv && tabWatchlist) {
    tabMovies.addEventListener('click', () => {
        currentTab = 'movie';
        setActiveTab(tabMovies, 'Filem Popular Hari Ini');
        fetchContent('movie');
    });
    tabTv.addEventListener('click', () => {
        currentTab = 'tv';
        setActiveTab(tabTv, 'Siri TV Popular Gempak');
        fetchContent('tv');
    });
    tabWatchlist.addEventListener('click', () => {
        currentTab = 'watchlist';
        setActiveTab(tabWatchlist, 'Senarai Simpanan Saya');
        movieGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#666;">Ciri Watchlist akan disatukan dengan Firebase anda.</p>`;
    });
}

function setActiveTab(tabElement, titleText) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tabElement.classList.add('active');
    titleDisplay.textContent = titleText;
    if (searchInput) searchInput.value = ''; 
}

// Panggilan pertama semasa web dibuka
fetchContent('movie');