import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

// Semak status user. Jika sudah login, halang masuk auth.html dan hantar ke index.html
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = 'index.html';
    }
});

// Elemen UI untuk pertukaran borang
const loginContainer = document.getElementById('login-form-container');
const signupContainer = document.getElementById('signup-form-container');
const goToSignup = document.getElementById('go-to-signup');
const goToLogin = document.getElementById('go-to-login');

goToSignup.addEventListener('click', () => {
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'block';
});

goToLogin.addEventListener('click', () => {
    signupContainer.style.display = 'none';
    loginContainer.style.display = 'block';
});

// LOGIK DAFTAR AKAUN (SIGN UP)
document.getElementById('signup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then(() => {
            alert('Pendaftaran berjaya! Selamat datang ke GempakMovies.');
            window.location.href = 'index.html';
        })
        .catch((error) => {
            alert('Ralat Daftar: ' + error.message);
        });
});

// LOGIK LOG MASUK (LOGIN)
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            alert('Log masuk berjaya!');
            window.location.href = 'index.html';
        })
        .catch((error) => {
            alert('Ralat Log Masuk: ' + error.message);
        });
});