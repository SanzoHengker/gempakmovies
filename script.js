// CONFIGURASI API TMDB (TOKEN DAN KEY ANDA)
const API_KEY = '3b6cf88c2120b59987bb29ee818cab83'; 
const API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzYjZjZjg4YzIxMjBiNTk5ODdiYjI5ZWU4MThjYWI4MyIsIm5iZiI6MTc3OTUxMTU0Ny45NDEsInN1YiI6IjZhMTEzMGZiMWYyNDVkOWE2ODRiNDc3OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.QshCr1EhnIf-M6acv3Y-iEwwx0IYwtt1DJnMStEOOX4';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

// TUKAR DOMAIN KE vidsrc.me (LEBIH STABIL & AKTIF)
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

// Menyimpan keadaan siri TV semasa
let currentShowState = {
    id: null,
    currentEpisode: 1,
    totalEpisodes: 0,
    season: 1
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

const episodesContainer = document.getElementById('episodes-container');
const episodesList = document.getElementById('episodes-list');

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
   LOGIK MODAL PLAYER & SENARAI EPISOD SEBENAR
   ========================================== */

async function openModal(item, type) {
    movieModal.style.display = 'flex';
    modalTitle.textContent = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date || '';
    modalYear.textContent = releaseDate ? releaseDate.substring(0, 4) : 'N/A';
    modalRating.textContent = `★ ${item.vote_average ? item.vote_average.toFixed(1) : '0.0'}`;
    modalOverview.textContent = item.overview || 'Tiada sinopsis disediakan.';

    if (type === 'tv') {
        let totalEpisodes = 0;
        try {
            // Tarik data daripada Season 1
            const response = await fetch(`${BASE_URL}/tv/${item.id}/season/1?language=ms-MY`, fetchOptions);
            if (response.ok) {
                const data = await response.json();
                if (data.episodes && data.episodes.length > 0) {
                    totalEpisodes = data.episodes.length;
                }
            }
        } catch (err) {
            console.error("Gagal mendapatkan senarai episod siri TV dari TMDB:", err);
        }

        if (totalEpisodes === 0) {
            totalEpisodes = 8; // Menggunakan backup dinamik berdasarkan gambar anda
        }

        // Simpan kedudukan siri TV dalam state global
        currentShowState.id = item.id;
        currentShowState.currentEpisode = 1;
        currentShowState.totalEpisodes = totalEpisodes;
        currentShowState.season = 1;

        // Cetak butang senarai episod ke dalam modal
        renderEpisodes(totalEpisodes);
        episodesContainer.style.display = 'block';
        
        // Mainkan episod 1 secara automatik
        playEpisode(1);
    } else {
        episodesContainer.style.display = 'none';
        videoPlayer.src = `${MOVIE_EMBED_URL}${item.id}`;
        currentShowState.id = null; 
    }
}

// Bina butang nombor episod
function renderEpisodes(total) {
    episodesList.innerHTML = '';
    for (let i = 1; i <= total; i++) {
        const btn = document.createElement('button');
        btn.classList.add('episode-btn');
        btn.id = `ep-${i}`;
        btn.innerText = `Ep ${i}`;
        btn.addEventListener('click', () => {
            playEpisode(i);
        });
        episodesList.appendChild(btn);
    }
}

// Tukar sumber link player siri TV mengikut episod yang dipilih
function playEpisode(episodeNum) {
    currentShowState.currentEpisode = episodeNum;
    
    const allBtns = document.querySelectorAll('.episode-btn');
    allBtns.forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.getElementById(`ep-${episodeNum}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Menghubungkan terus ke domain vidsrc.me yang aktif
    videoPlayer.src = `${TV_EMBED_URL}${currentShowState.id}/${currentShowState.season}-${episodeNum}`;
}

/* ==========================================
   LOGIK AUTOPLAY NEXT EPISODE
   ========================================== */
window.addEventListener('message', function(event) {
    if (event.data === 'ended' || event.data?.event === 'ended' || event.data?.event === 'finish') {
        handleVideoEnded();
    }
});

function handleVideoEnded() {
    if (currentShowState.id) {
        const nextEpisode = currentShowState.currentEpisode + 1;
        if (nextEpisode <= currentShowState.totalEpisodes) {
            playEpisode(nextEpisode);
        }
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
