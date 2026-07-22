import { Auth } from "./auth.js";
import { db } from "./firebase-config.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class AppManager {
  constructor() {
    this.currentServer = 'home';
    this.currentChannel = null;
    this.isMobile = window.innerWidth < 1024;
  }

  init() {
    Auth.initAuthListener();
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < 1024;
    });
    
    // Enter key for messages
    document.getElementById('message-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') ChatEngine.sendMessage();
    });
    document.getElementById('mobile-message-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') ChatEngine.sendMessageMobile();
    });

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(console.error);
    }
  }

  initUserUI(userData) {
    // Avatar
    const avatarImg = document.getElementById('user-avatar-img');
    const settingsAvatar = document.getElementById('settings-avatar');
    if (avatarImg) avatarImg.src = userData.photoURL;
    if (settingsAvatar) settingsAvatar.src = userData.photoURL;
    
    // Name
    document.getElementById('user-display-name').textContent = userData.displayName;
    document.getElementById('settings-displayname').value = userData.displayName;
    document.getElementById('settings-status').value = userData.customStatus || '';
    
    // Status
    const statusText = document.getElementById('user-custom-status');
    if (userData.customStatus) {
      statusText.textContent = userData.customStatus;
    }
    
    // Stealth toggle
    document.getElementById('stealth-toggle').checked = userData.stealthMode || false;
    
    // DND toggle
    document.getElementById('dnd-toggle').checked = userData.autoDND !== false;
    
    // Theme
    if (userData.themeConfig) {
      CustomFeatures.applyTheme(userData.themeConfig);
    }
  }

  toggleAuthMode() {
    const loginForm = document.getElementById('auth-login-form');
    const regForm = document.getElementById('auth-register-form');
    loginForm.classList.toggle('hidden');
    regForm.classList.toggle('hidden');
    document.getElementById('auth-error').classList.add('hidden');
  }

  selectServer(serverId) {
    this.currentServer = serverId;
    document.querySelectorAll('.server-item').forEach(el => el.classList.remove('active'));
    event.currentTarget?.classList.add('active');
    
    if (serverId === 'home') {
      document.getElementById('current-server-name').textContent = 'Türkcord';
      ServerManager.loadDMChannels();
    } else {
      ServerManager.loadServerChannels(serverId);
    }
  }

  selectDM() {
    this.currentServer = 'home';
    this.currentChannel = 'friends';
    document.getElementById('current-channel-name').textContent = 'Arkadaşlar';
    document.getElementById('channel-topic').textContent = 'DM listesi';
    ChatEngine.loadMessages('dm', 'friends');
  }

  showExplore() {
    App.showToast('Keşfet özelliği yakında geliyor!', 'success');
  }

  showMembers() {
    if (this.isMobile) {
      this.toggleRightDrawer();
    }
  }

  showUserSettings() {
    document.getElementById('modal-settings').classList.remove('hidden');
  }

  closeModal(id) {
    document.getElementById(id).classList.add('hidden');
  }

  switchSettingsTab(tab) {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.settings-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`settings-${tab}`).classList.remove('hidden');
  }

  async saveProfile() {
    if (!Auth.currentUser) return;
    
    const displayName = document.getElementById('settings-displayname').value;
    const customStatus = document.getElementById('settings-status').value;
    
    try {
      await updateDoc(doc(db, "users", Auth.currentUser.uid), {
        displayName,
        customStatus,
        updatedAt: new Date()
      });
      
      document.getElementById('user-display-name').textContent = displayName;
      document.getElementById('user-custom-status').textContent = customStatus || 'Çevrimiçi';
      App.showToast('Profil güncellendi!', 'success');
    } catch (err) {
      App.showError('Profil güncellenirken hata oluştu.');
    }
  }

  async handleAvatarUpload(input) {
    if (!input.files?.[0] || !Auth.currentUser) return;
    
    const file = input.files[0];
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const res = await fetch('https://api.imgbb.com/1/upload?key=533b81bcf48bdf30b6d6b6e8d044b45d', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        await updateDoc(doc(db, "users", Auth.currentUser.uid), {
          photoURL: data.data.url
        });
        document.getElementById('user-avatar-img').src = data.data.url;
        document.getElementById('settings-avatar').src = data.data.url;
        App.showToast('Profil fotoğrafı güncellendi!', 'success');
      }
    } catch (err) {
      App.showError('Fotoğraf yüklenirken hata oluştu.');
    }
  }

  toggleMute() {
    const icon = document.getElementById('mic-icon');
    if (icon.classList.contains('fa-microphone')) {
      icon.classList.replace('fa-microphone', 'fa-microphone-slash');
      icon.style.color = 'var(--danger)';
    } else {
      icon.classList.replace('fa-microphone-slash', 'fa-microphone');
      icon.style.color = '';
    }
  }

  toggleLeftDrawer() {
    document.getElementById('mobile-drawer-left').classList.toggle('open');
  }

  toggleRightDrawer() {
    document.getElementById('mobile-drawer-right').classList.toggle('open');
  }

  navTo(screen) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    if (screen === 'profile') {
      this.showUserSettings();
    } else if (screen === 'dms') {
      this.selectDM();
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-circle-exclamation' : 'fa-info-circle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  showError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
    this.showToast(msg, 'error');
  }
}

const App = new AppManager();
window.App = App; // Global access for onclick handlers
App.init();

export { App };
