import { Auth } from "./auth.js";
import { db } from "./firebase-config.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class CustomFeaturesClass {
  constructor() {
    this.dndInterval = null;
  }

  init(userData) {
    if (userData?.autoDND !== false) {
      this.startDNDChecker();
    }
    if (userData?.themeConfig) {
      this.applyTheme(userData.themeConfig);
    }
  }

  async toggleStealth() {
    if (!Auth.currentUser) return;
    const enabled = document.getElementById('stealth-toggle').checked;
    
    await updateDoc(doc(db, "users", Auth.currentUser.uid), {
      stealthMode: enabled
    });
    
    Auth.userData.stealthMode = enabled;
    App.showToast(`Gizli okuma modu ${enabled ? 'açıldı' : 'kapandı'}.`, 'success');
  }

  async toggleAutoDND() {
    if (!Auth.currentUser) return;
    const enabled = document.getElementById('dnd-toggle').checked;
    
    await updateDoc(doc(db, "users", Auth.currentUser.uid), {
      autoDND: enabled
    });
    
    if (enabled) {
      this.startDNDChecker();
    } else {
      clearInterval(this.dndInterval);
    }
    
    App.showToast(`Sessiz saatler ${enabled ? 'aktif' : 'devre dışı'}.`, 'success');
  }

  startDNDChecker() {
    if (this.dndInterval) clearInterval(this.dndInterval);
    
    const check = () => {
      const hour = new Date().getHours();
      const isDND = hour >= 23 || hour < 8;
      const dot = document.getElementById('user-status-dot');
      
      if (isDND && dot) {
        dot.className = 'status-indicator dnd';
        document.getElementById('user-custom-status').textContent = 'Rahatsız Etmeyin (Otomatik)';
      } else if (dot) {
        dot.className = 'status-indicator online';
        document.getElementById('user-custom-status').textContent = Auth.userData?.customStatus || 'Çevrimiçi';
      }
    };
    
    check();
    this.dndInterval = setInterval(check, 60000);
  }

  updateTheme() {
    const primary = document.getElementById('theme-primary').value;
    const bg = document.getElementById('theme-bg').value;
    
    this.applyTheme({ primaryColor: primary, bgColor: bg });
    
    if (Auth.currentUser) {
      updateDoc(doc(db, "users", Auth.currentUser.uid), {
        'themeConfig.primaryColor': primary,
        'themeConfig.bgColor': bg
      });
    }
  }

  applyTheme(config) {
    if (config.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', config.primaryColor);
      document.documentElement.style.setProperty('--primary-hover', this.adjustColor(config.primaryColor, -20));
    }
    if (config.bgColor) {
      document.documentElement.style.setProperty('--bg-color', config.bgColor);
      // Derive secondary colors
      document.documentElement.style.setProperty('--bg-secondary', this.adjustColor(config.bgColor, -10));
      document.documentElement.style.setProperty('--bg-tertiary', this.adjustColor(config.bgColor, -20));
    }
  }

  resetTheme() {
    const defaultTheme = { primaryColor: "#5865F2", bgColor: "#313338" };
    document.getElementById('theme-primary').value = defaultTheme.primaryColor;
    document.getElementById('theme-bg').value = defaultTheme.bgColor;
    this.applyTheme(defaultTheme);
    
    if (Auth.currentUser) {
      updateDoc(doc(db, "users", Auth.currentUser.uid), {
        themeConfig: defaultTheme
      });
    }
  }

  adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
}

const CustomFeatures = new CustomFeaturesClass();
window.CustomFeatures = CustomFeatures;
export { CustomFeatures };
