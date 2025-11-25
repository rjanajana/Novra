// NOVRA X - Login System
// Firebase Configuration & Authentication

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBOrXbkrde5xTxD3q54JF9PwhwhLQ2_nWA",
    authDomain: "emotebot-678ce.firebaseapp.com",
    databaseURL: "https://emotebot-678ce-default-rtdb.firebaseio.com",
    projectId: "emotebot-678ce",
    storageBucket: "emotebot-678ce.firebasestorage.app",
    messagingSenderId: "424825439257",
    appId: "1:424825439257:web:5ca282c6c2d70a086b5688",
    measurementId: "G-24KHRVXERP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Load Social Links from Firebase
async function loadSocialLinks() {
    try {
        const docRef = doc(db, 'settings', 'footerLinks');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const links = docSnap.data();
            document.getElementById('telegram').href = links.telegram || '#';
            document.getElementById('github').href = links.github || '#';
            document.getElementById('discord').href = links.discord || '#';
            document.getElementById('youtube').href = links.youtube || '#';
        }
    } catch (error) {
        console.log('Social links not configured yet');
    }
}

// Hash Password Function
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const input = document.getElementById('loginPassword');
    const errorMsg = document.getElementById('loginError');
    const password = input.value;
    
    try {
        const docRef = doc(db, 'settings', 'loginPassword');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            // Password exists - verify it
            const storedHash = docSnap.data().hash;
            const inputHash = await hashPassword(password);
            
            if (inputHash === storedHash) {
                // Login successful
                sessionStorage.setItem('auth', 'true');
                window.location.href = 'dashboard.html';
            } else {
                // Wrong password
                input.classList.add('shake');
                errorMsg.textContent = '❌ Invalid Password';
                errorMsg.classList.remove('hidden');
                
                setTimeout(() => {
                    input.classList.remove('shake');
                    errorMsg.classList.add('hidden');
                }, 2000);
            }
        } else {
            // First time setup - create password
            const hash = await hashPassword(password);
            await setDoc(doc(db, 'settings', 'loginPassword'), { hash });
            sessionStorage.setItem('auth', 'true');
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorMsg.textContent = '❌ Connection Error - Check Firebase setup';
        errorMsg.classList.remove('hidden');
    }
});

// Initialize
loadSocialLinks();
console.log('✅ Login page ready');