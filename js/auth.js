import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const SUPER_ADMIN_EMAIL = "necron.offical@gmail.com";

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.userData = null;
    this.unsubscribe = null;
  }

  async register() {
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const displayName = document.getElementById('reg-displayname').value.trim() || email.split('@')[0];
    
    if (!email || !password) {
      window.App.showError('E-posta ve şifre zorunludur.');
      return;
    }
    if (password.length < 6) {
      window.App.showError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName });

      const isSuperAdmin = email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      const role = isSuperAdmin ? "superadmin" : "user";
      const isServerCreator = isSuperAdmin;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        customStatus: "",
        themeConfig: { mode: "dark", primaryColor: "#5865F2", bgColor: "#313338" },
        role,
        isServerCreator,
        stealthMode: false,
        autoDND: true,
        createdAt: serverTimestamp()
      });

      window.App.showToast('Kayıt başarılı! Hoş geldin.', 'success');
    } catch (err) {
      window.App.showError(this.getErrorMessage(err.code));
    }
  }

  async login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      window.App.showError('E-posta ve şifre zorunludur.');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.App.showToast('Giriş başarılı!', 'success');
    } catch (err) {
      window.App.showError(this.getErrorMessage(err.code));
    }
  }

  async logout() {
    try {
      await signOut(auth);
      window.App.showToast('Çıkış yapıldı.', 'success');
    } catch (err) {
      window.App.showError('Çıkış yapılırken hata oluştu.');
    }
  }

  async getUserData(uid) {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  }

  async updateUserProfile(uid, data) {
    await updateDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() });
  }

  getErrorMessage(code) {
    const errors = {
      'auth/invalid-email': 'Geçersiz e-posta adresi.',
      'auth/user-disabled': 'Bu hesap devre dışı bırakılmış.',
      'auth/user-not-found': 'Kullanıcı bulunamadı.',
      'auth/wrong-password': 'Hatalı şifre.',
      'auth/email-already-in-use': 'Bu e-posta zaten kullanımda.',
      'auth/weak-password': 'Şifre çok zayıf.',
      'auth/invalid-credential': 'E-posta veya şifre hatalı.'
    };
    return errors[code] || 'Bir hata oluştu. Tekrar deneyin.';
  }

  initAuthListener() {
    this.unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        this.userData = await this.getUserData(user.uid);
        
        document.getElementById('auth-overlay').classList.remove('active');
        document.getElementById('app-container').classList.remove('hidden');
        document.getElementById('mobile-container').classList.remove('hidden');
        
        window.App.initUserUI(this.userData);
        window.ServerManager.loadServers();
        window.ChatEngine.init();
        window.CustomFeatures.init(this.userData);
        
        if (this.userData?.isServerCreator || this.userData?.role === 'admin' || this.userData?.role === 'superadmin') {
          document.getElementById('btn-create-server').classList.remove('hidden');
        }
      } else {
        this.currentUser = null;
        this.userData = null;
        document.getElementById('auth-overlay').classList.add('active');
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('mobile-container').classList.add('hidden');
      }
    });
  }

  canCreateServer() {
    if (!this.userData) return false;
    return this.userData.isServerCreator === true || 
           this.userData.role === "admin" || 
           this.userData.role === "superadmin";
  }

  isSuperAdmin() {
    return this.userData?.role === "superadmin";
  }
}

const Auth = new AuthManager();

// 🔴 BURASI EKSİKTİ: Global scope'a atama
window.Auth = Auth;

export { Auth };
