import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCXJoZyHnni3i_H8gBp77sYdRSLOU-ALKc",
  authDomain: "turkcord-offical.firebaseapp.com",
  projectId: "turkcord-offical",
  storageBucket: "turkcord-offical.firebasestorage.app",
  messagingSenderId: "292074383928",
  appId: "1:292074383928:web:9c80e70a1fec11a64814cd",
  measurementId: "G-B0ZDHJFPHQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);

export { app, auth, db, rtdb, storage };
