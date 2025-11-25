// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// Loader Functions
function showLoader() {
    const loader = document.getElementById('adminLoader');
    if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
    const loader = document.getElementById('adminLoader');
    if (loader) loader.classList.add('hidden');
}

// Hash Password
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ===== ADMIN LOGIN =====
const loginForm = document.getElementById('adminLoginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('adminEmail');
        const passwordInput = document.getElementById('adminPassword');
        const errorDiv = document.getElementById('adminLoginError');
        
        if (!emailInput || !passwordInput || !errorDiv) {
            console.error('❌ Form elements not found');
            return;
        }
        
        const email = emailInput.value;
        const password = passwordInput.value;

        showLoader();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            const loginView = document.getElementById('adminLoginView');
            const dashboard = document.getElementById('adminDashboard');
            if (loginView) loginView.classList.add('hidden');
            if (dashboard) dashboard.classList.remove('hidden');
            await loadAllData();
        } catch (error) {
            errorDiv.textContent = '❌ Invalid credentials';
            errorDiv.classList.remove('hidden');
            setTimeout(() => errorDiv.classList.add('hidden'), 3000);
            console.error('Login error:', error);
        } finally {
            hideLoader();
        }
    });
}

// Admin Logout
const logoutBtn = document.getElementById('adminLogout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await signOut(auth);
        location.reload();
    });
}

// Load All Data
async function loadAllData() {
    await loadServers();
    await loadCategories();
    await loadCategoryDropdown();
    await loadEmotes();
    await loadLinks();
    await loadMaintenance();
}

// ===== SERVER MANAGEMENT =====
async function loadServers() {
    const serverList = document.getElementById('serverList');
    if (!serverList) return;
    
    serverList.innerHTML = '';
    
    try {
        const serversCol = collection(db, 'servers');
        const snapshot = await getDocs(serversCol);
        
        if (snapshot.empty) {
            serverList.innerHTML = '<p class="no-data">No servers added yet</p>';
            return;
        }
        
        const servers = [];
        snapshot.forEach(doc => {
            servers.push({ id: doc.id, ...doc.data() });
        });
        
        servers.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Group servers by region with proper categorization
        const indianServers = servers.filter(s => s.region === 'indian');
        const bangladeshServers = servers.filter(s => s.region === 'bangladesh');
        const otherServers = servers.filter(s => s.region === 'other');
        
        console.log('📊 Server Categorization:', {
            indian: indianServers.length,
            bangladesh: bangladeshServers.length,
            other: otherServers.length
        });
        
        // Create region headers
        if (indianServers.length > 0) {
            const regionHeader = document.createElement('div');
            regionHeader.className = 'region-header';
            regionHeader.innerHTML = `<h3>🇮🇳 Indian Servers (${indianServers.length})</h3>`;
            serverList.appendChild(regionHeader);
            
            indianServers.forEach(server => {
                serverList.appendChild(createServerItem(server));
            });
        }
        
        if (bangladeshServers.length > 0) {
            const regionHeader = document.createElement('div');
            regionHeader.className = 'region-header';
            regionHeader.innerHTML = `<h3>🇧🇩 Bangladesh Servers (${bangladeshServers.length})</h3>`;
            serverList.appendChild(regionHeader);
            
            bangladeshServers.forEach(server => {
                serverList.appendChild(createServerItem(server));
            });
        }
        
        if (otherServers.length > 0) {
            const regionHeader = document.createElement('div');
            regionHeader.className = 'region-header';
            regionHeader.innerHTML = `<h3>🌍 Other Servers (${otherServers.length})</h3>`;
            serverList.appendChild(regionHeader);
            
            otherServers.forEach(server => {
                serverList.appendChild(createServerItem(server));
            });
        }
        
        // Show message if no servers in any category
        if (servers.length === 0) {
            serverList.innerHTML = '<p class="no-data">No servers added yet</p>';
        }
        
    } catch (error) {
        console.error('Server load error:', error);
        serverList.innerHTML = '<p class="error-text">Error loading servers</p>';
    }
}

function createServerItem(server) {
    const item = document.createElement('div');
    item.className = 'admin-item';
    
    const regionIcon = server.region === 'indian' ? '🇮🇳' : 
                      server.region === 'bangladesh' ? '🇧🇩' : '🌍';
    
    const regionName = server.region === 'indian' ? 'Indian' :
                      server.region === 'bangladesh' ? 'Bangladesh' : 'Other';
    
    item.innerHTML = `
        <div class="admin-item-info">
            <strong>${regionIcon} ${server.name}</strong>
            <span style="color: var(--text-gray); font-size: 12px;">${server.baseUrl}</span>
            <span style="color: var(--text-gray); font-size: 11px; display: block; margin-top: 2px;">
                Region: ${regionName} | Order: ${server.order || 0}
            </span>
        </div>
        <div class="admin-item-actions">
            <button class="action-icon-btn pin" data-action="editServer" 
                    data-id="${server.id}" 
                    data-name="${server.name}" 
                    data-url="${server.baseUrl}" 
                    data-region="${server.region}"
                    data-order="${server.order || 0}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                </svg>
            </button>
            <button class="action-icon-btn close" data-action="deleteServer" data-id="${server.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
                </svg>
            </button>
        </div>
    `;
    
    // Add event listeners
    const editBtn = item.querySelector('[data-action="editServer"]');
    const deleteBtn = item.querySelector('[data-action="deleteServer"]');
    
    editBtn.addEventListener('click', () => {
        editServer(
            editBtn.dataset.id, 
            editBtn.dataset.name, 
            editBtn.dataset.url, 
            editBtn.dataset.region,
            editBtn.dataset.order
        );
    });
    
    deleteBtn.addEventListener('click', () => {
        deleteServer(deleteBtn.dataset.id);
    });
    
    return item;
}

const serverForm = document.getElementById('serverForm');
if (serverForm) {
    serverForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editServerId').value;
        const name = document.getElementById('serverName').value;
        const baseUrl = document.getElementById('serverUrl').value;
        const region = document.getElementById('serverRegion').value;
        const order = parseInt(document.getElementById('serverOrder').value) || 0;

        // Validate region selection
        if (!region) {
            alert('❌ Please select a region');
            return;
        }

        console.log('➕ Adding Server:', { name, baseUrl, region, order });

        showLoader();
        try {
            const serverData = { 
                name, 
                baseUrl, 
                region: region, // Ensure region is properly saved
                order 
            };
            
            if (editId) {
                await updateDoc(doc(db, 'servers', editId), serverData);
                console.log('✅ Server updated:', serverData);
            } else {
                await addDoc(collection(db, 'servers'), serverData);
                console.log('✅ Server added:', serverData);
            }
            
            serverForm.reset();
            document.getElementById('editServerId').value = '';
            document.getElementById('serverBtnText').textContent = 'ADD SERVER';
            document.getElementById('cancelServerEdit').classList.add('hidden');
            await loadServers();
            alert(`✅ Server saved successfully in ${getRegionName(region)} category!`);
        } catch (error) {
            alert('❌ Error: ' + error.message);
            console.error('Server save error:', error);
        } finally {
            hideLoader();
        }
    });
}

// Helper function to get region name
function getRegionName(region) {
    const regions = {
        'indian': 'Indian 🇮🇳',
        'bangladesh': 'Bangladesh 🇧🇩', 
        'other': 'Other 🌍'
    };
    return regions[region] || 'Unknown';
}

function editServer(id, name, url, region, order) {
    console.log('✏️ Editing Server:', { id, name, url, region, order });
    
    document.getElementById('editServerId').value = id;
    document.getElementById('serverName').value = name;
    document.getElementById('serverUrl').value = url;
    document.getElementById('serverRegion').value = region;
    document.getElementById('serverOrder').value = order;
    document.getElementById('serverBtnText').textContent = 'UPDATE SERVER';
    document.getElementById('cancelServerEdit').classList.remove('hidden');
    window.scrollTo(0, 0);
}

async function deleteServer(id) {
    if (confirm('❌ Delete this server?')) {
        showLoader();
        try {
            await deleteDoc(doc(db, 'servers', id));
            await loadServers();
            alert('✅ Server deleted!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    }
}

const cancelServerEdit = document.getElementById('cancelServerEdit');
if (cancelServerEdit) {
    cancelServerEdit.addEventListener('click', () => {
        serverForm.reset();
        document.getElementById('editServerId').value = '';
        document.getElementById('serverBtnText').textContent = 'ADD SERVER';
        cancelServerEdit.classList.add('hidden');
    });
}

// ===== CATEGORY MANAGEMENT =====
async function loadCategories() {
    const categoryList = document.getElementById('categoryList');
    if (!categoryList) return;
    
    categoryList.innerHTML = '';
    
    try {
        const categoriesCol = collection(db, 'categories');
        const snapshot = await getDocs(categoriesCol);
        
        if (snapshot.empty) {
            categoryList.innerHTML = '<p class="no-data">No categories added yet</p>';
            return;
        }
        
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        categories.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'admin-item';
            item.innerHTML = `
                <div class="admin-item-info">
                    <strong>${cat.icon || ''} ${cat.name}</strong>
                    <span style="color: var(--text-gray); font-size: 12px;">Order: ${cat.order || 0}</span>
                </div>
                <div class="admin-item-actions">
                    <button class="action-icon-btn pin" data-action="editCategory" data-id="${cat.id}" data-name="${cat.name}" data-icon="${cat.icon || ''}" data-order="${cat.order || 0}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="action-icon-btn close" data-action="deleteCategory" data-id="${cat.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            `;
            categoryList.appendChild(item);
        });
        
        // Add event listeners
        categoryList.querySelectorAll('[data-action="editCategory"]').forEach(btn => {
            btn.addEventListener('click', () => {
                editCategory(btn.dataset.id, btn.dataset.name, btn.dataset.icon, btn.dataset.order);
            });
        });
        
        categoryList.querySelectorAll('[data-action="deleteCategory"]').forEach(btn => {
            btn.addEventListener('click', () => {
                deleteCategory(btn.dataset.id);
            });
        });
        
    } catch (error) {
        console.error('Category load error:', error);
    }
}

async function loadCategoryDropdown() {
    try {
        const categoriesCol = collection(db, 'categories');
        const snapshot = await getDocs(categoriesCol);
        const select = document.getElementById('emoteCategory');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Category</option>';
        
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `${cat.icon || ''} ${cat.name}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Category dropdown error:', error);
    }
}

const categoryForm = document.getElementById('categoryForm');
if (categoryForm) {
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editCategoryId').value;
        const name = document.getElementById('categoryName').value;
        const icon = document.getElementById('categoryIcon').value;
        const order = parseInt(document.getElementById('categoryOrder').value) || 0;

        showLoader();
        try {
            const categoryData = { name, icon, order };
            
            if (editId) {
                await updateDoc(doc(db, 'categories', editId), categoryData);
            } else {
                await addDoc(collection(db, 'categories'), categoryData);
            }
            
            categoryForm.reset();
            document.getElementById('editCategoryId').value = '';
            document.getElementById('categoryBtnText').textContent = 'ADD CATEGORY';
            document.getElementById('cancelCategoryEdit').classList.add('hidden');
            await loadCategories();
            await loadCategoryDropdown();
            alert('✅ Category saved!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    });
}

function editCategory(id, name, icon, order) {
    document.getElementById('editCategoryId').value = id;
    document.getElementById('categoryName').value = name;
    document.getElementById('categoryIcon').value = icon;
    document.getElementById('categoryOrder').value = order;
    document.getElementById('categoryBtnText').textContent = 'UPDATE CATEGORY';
    document.getElementById('cancelCategoryEdit').classList.remove('hidden');
    window.scrollTo(0, 0);
}

async function deleteCategory(id) {
    if (confirm('❌ Delete this category?')) {
        showLoader();
        try {
            await deleteDoc(doc(db, 'categories', id));
            await loadCategories();
            await loadCategoryDropdown();
            alert('✅ Category deleted!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    }
}

const cancelCategoryEdit = document.getElementById('cancelCategoryEdit');
if (cancelCategoryEdit) {
    cancelCategoryEdit.addEventListener('click', () => {
        categoryForm.reset();
        document.getElementById('editCategoryId').value = '';
        document.getElementById('categoryBtnText').textContent = 'ADD CATEGORY';
        cancelCategoryEdit.classList.add('hidden');
    });
}

// ===== EMOTE MANAGEMENT =====
async function loadEmotes() {
    const emoteList = document.getElementById('emoteList');
    if (!emoteList) return;
    
    emoteList.innerHTML = '';
    
    try {
        const emotesCol = collection(db, 'emotes');
        const snapshot = await getDocs(emotesCol);
        
        if (snapshot.empty) {
            emoteList.innerHTML = '<p class="no-data">No emotes added yet</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const emote = doc.data();
            const item = document.createElement('div');
            item.className = 'admin-item';
            item.innerHTML = `
                <div class="admin-item-info" style="display: flex; align-items: center; gap: 10px;">
                    <img src="${emote.imageUrl}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 8px;">
                    <div>
                        <strong>${emote.emoteId}</strong>
                        <span style="color: var(--text-gray); font-size: 12px; display: block;">Category: ${emote.category}</span>
                    </div>
                </div>
                <div class="admin-item-actions">
                    <button class="action-icon-btn pin" data-action="editEmote" data-id="${doc.id}" data-url="${emote.imageUrl}" data-category="${emote.category}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="action-icon-btn close" data-action="deleteEmote" data-id="${doc.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            `;
            emoteList.appendChild(item);
        });
        
        // Add event listeners
        emoteList.querySelectorAll('[data-action="editEmote"]').forEach(btn => {
            btn.addEventListener('click', () => {
                editEmote(btn.dataset.id, btn.dataset.url, btn.dataset.category);
            });
        });
        
        emoteList.querySelectorAll('[data-action="deleteEmote"]').forEach(btn => {
            btn.addEventListener('click', () => {
                deleteEmote(btn.dataset.id);
            });
        });
        
    } catch (error) {
        console.error('Emote load error:', error);
    }
}

const emoteImageInput = document.getElementById('emoteImageUrl');
if (emoteImageInput) {
    emoteImageInput.addEventListener('input', (e) => {
        const url = e.target.value;
        const preview = document.getElementById('emotePreview');
        if (preview) {
            if (url) {
                preview.innerHTML = `<img src="${url}" style="max-width: 150px; max-height: 150px; border-radius: 10px;">`;
            } else {
                preview.innerHTML = '';
            }
        }
    });
}

const emoteForm = document.getElementById('emoteForm');
if (emoteForm) {
    emoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editEmoteId').value;
        const imageUrl = document.getElementById('emoteImageUrl').value;
        const category = document.getElementById('emoteCategory').value;
        
        const filename = imageUrl.split('/').pop();
        const emoteId = filename.split('.')[0];

        showLoader();
        try {
            const emoteData = { imageUrl, category, emoteId };
            
            if (editId) {
                await updateDoc(doc(db, 'emotes', editId), emoteData);
            } else {
                await addDoc(collection(db, 'emotes'), emoteData);
            }
            
            emoteForm.reset();
            document.getElementById('editEmoteId').value = '';
            document.getElementById('emoteBtnText').textContent = 'ADD EMOTE';
            document.getElementById('cancelEmoteEdit').classList.add('hidden');
            document.getElementById('emotePreview').innerHTML = '';
            await loadEmotes();
            alert('✅ Emote saved!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    });
}

function editEmote(id, url, category) {
    document.getElementById('editEmoteId').value = id;
    document.getElementById('emoteImageUrl').value = url;
    document.getElementById('emoteCategory').value = category;
    document.getElementById('emoteBtnText').textContent = 'UPDATE EMOTE';
    document.getElementById('cancelEmoteEdit').classList.remove('hidden');
    document.getElementById('emotePreview').innerHTML = `<img src="${url}" style="max-width: 150px; max-height: 150px; border-radius: 10px;">`;
    window.scrollTo(0, document.getElementById('emoteForm').offsetTop - 100);
}

async function deleteEmote(id) {
    if (confirm('❌ Delete this emote?')) {
        showLoader();
        try {
            await deleteDoc(doc(db, 'emotes', id));
            await loadEmotes();
            alert('✅ Emote deleted!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    }
}

const cancelEmoteEdit = document.getElementById('cancelEmoteEdit');
if (cancelEmoteEdit) {
    cancelEmoteEdit.addEventListener('click', () => {
        emoteForm.reset();
        document.getElementById('editEmoteId').value = '';
        document.getElementById('emoteBtnText').textContent = 'ADD EMOTE';
        cancelEmoteEdit.classList.add('hidden');
        document.getElementById('emotePreview').innerHTML = '';
    });
}

// ===== FOOTER LINKS =====
async function loadLinks() {
    try {
        const docRef = doc(db, 'settings', 'footerLinks');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const links = docSnap.data();
            document.getElementById('telegramUrl').value = links.telegram || '';
            document.getElementById('githubUrl').value = links.github || '';
            document.getElementById('discordUrl').value = links.discord || '';
            document.getElementById('youtubeUrl').value = links.youtube || '';
        }
    } catch (error) {
        console.log('Footer links not configured');
    }
}

const linksForm = document.getElementById('linksForm');
if (linksForm) {
    linksForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();
        try {
            await setDoc(doc(db, 'settings', 'footerLinks'), {
                telegram: document.getElementById('telegramUrl').value,
                github: document.getElementById('githubUrl').value,
                discord: document.getElementById('discordUrl').value,
                youtube: document.getElementById('youtubeUrl').value
            });
            alert('✅ Links updated!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    });
}

// ===== MAINTENANCE MODE =====
async function loadMaintenance() {
    try {
        const docRef = doc(db, 'settings', 'maintenance');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('maintenanceToggle').checked = data.enabled || false;
            document.getElementById('maintenanceMessage').value = data.message || '';
        }
    } catch (error) {
        console.log('Maintenance settings not configured');
    }
}

const maintenanceForm = document.getElementById('maintenanceForm');
if (maintenanceForm) {
    maintenanceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();
        try {
            await setDoc(doc(db, 'settings', 'maintenance'), {
                enabled: document.getElementById('maintenanceToggle').checked,
                message: document.getElementById('maintenanceMessage').value
            });
            alert('✅ Maintenance settings saved!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    });
}

// ===== PASSWORD MANAGER =====
const passwordForm = document.getElementById('passwordForm');
if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        
        showLoader();
        try {
            const hash = await hashPassword(newPassword);
            await setDoc(doc(db, 'settings', 'loginPassword'), { hash });
            alert('✅ Password updated!\nNew password: ' + newPassword);
            document.getElementById('newPassword').value = '';
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    });
}

console.log('🔥 NOVRA X Admin Panel Ready!');