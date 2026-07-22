import { Auth } from "./auth.js";
import { db } from "./firebase-config.js";
import {
  collection, addDoc, doc, getDocs, query, where, serverTimestamp, orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class ServerManagerClass {
  constructor() {
    this.servers = [];
  }

  async loadServers() {
    if (!Auth.currentUser) return;
    
    const q = query(collection(db, "servers"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    
    const list = document.getElementById('server-list');
    // Keep home and divider
    const staticItems = list.querySelectorAll('.server-item, .server-divider');
    
    snap.forEach(doc => {
      const server = { id: doc.id, ...doc.data() };
      this.servers.push(server);
      
      const div = document.createElement('div');
      div.className = 'server-item';
      div.onclick = () => App.selectServer(server.id);
      div.title = server.name;
      div.innerHTML = server.iconURL 
        ? `<img src="${server.iconURL}" alt="${server.name}">`
        : `<span style="font-size:14px;font-weight:700;">${server.name.slice(0,2).toUpperCase()}</span>`;
      list.appendChild(div);
    });
  }

  showCreateModal() {
    if (!Auth.canCreateServer()) {
      App.showToast('Sunucu oluşturma yetkiniz yok.', 'error');
      return;
    }
    document.getElementById('modal-create-server').classList.remove('hidden');
  }

  async createServer() {
    const name = document.getElementById('new-server-name').value.trim();
    const iconURL = document.getElementById('new-server-icon').value.trim();
    
    if (!name) {
      App.showToast('Sunucu adı zorunludur.', 'error');
      return;
    }

    try {
      const serverRef = await addDoc(collection(db, "servers"), {
        name,
        iconURL: iconURL || "",
        ownerId: Auth.currentUser.uid,
        categories: [
          { name: "Metin Kanalları", channels: [{ name: "genel-sohbet", type: "text" }] },
          { name: "Ses Kanalları", channels: [{ name: "Genel Ses", type: "voice" }] }
        ],
        roles: [
          { name: "Admin", color: "#F23F43", permissions: ["all"] },
          { name: "Üye", color: "#B5BAC1", permissions: ["read", "write"] }
        ],
        createdAt: serverTimestamp()
      });

      // Create default text channel in channels collection
      await addDoc(collection(db, "channels"), {
        serverId: serverRef.id,
        name: "genel-sohbet",
        type: "text",
        category: "Metin Kanalları",
        permissions: { read: ["all"], write: ["all"] },
        createdAt: serverTimestamp()
      });

      App.showToast('Sunucu oluşturuldu!', 'success');
      App.closeModal('modal-create-server');
      this.loadServers();
    } catch (err) {
      console.error(err);
      App.showToast('Sunucu oluşturulurken hata.', 'error');
    }
  }

  async loadServerChannels(serverId) {
    const q = query(collection(db, "channels"), where("serverId", "==", serverId));
    const snap = await getDocs(q);
    
    const list = document.getElementById('channel-list');
    list.innerHTML = '';
    
    // Categories
    const categories = {};
    snap.forEach(doc => {
      const ch = { id: doc.id, ...doc.data() };
      if (!categories[ch.category]) categories[ch.category] = [];
      categories[ch.category].push(ch);
    });

    for (const [catName, channels] of Object.entries(categories)) {
      const catDiv = document.createElement('div');
      catDiv.className = 'channel-category';
      catDiv.innerHTML = `<span>${catName}</span>`;
      list.appendChild(catDiv);
      
      channels.forEach(ch => {
        const item = document.createElement('div');
        item.className = 'channel-item';
        item.onclick = () => this.selectChannel(ch.id, ch.name, ch.type);
        item.innerHTML = `
          <i class="fa-solid ${ch.type === 'voice' ? 'fa-volume-high' : 'fa-hashtag'}"></i>
          <span>${ch.name}</span>
        `;
        list.appendChild(item);
      });
    }
  }

  loadDMChannels() {
    const list = document.getElementById('channel-list');
    list.innerHTML = `
      <div class="channel-category"><span>ÖZEL MESAJLAR</span></div>
      <div class="channel-item active" onclick="App.selectDM()">
        <i class="fa-solid fa-user-group"></i>
        <span>Arkadaşlar</span>
      </div>
    `;
  }

  selectChannel(channelId, name, type) {
    App.currentChannel = channelId;
    document.getElementById('current-channel-name').textContent = name;
    document.getElementById('channel-icon').className = `fa-solid ${type === 'voice' ? 'fa-volume-high' : 'fa-hashtag'}`;
    document.getElementById('mobile-header-title').textContent = `# ${name}`;
    
    if (type === 'voice') {
      ChatEngine.loadVoiceChannel(channelId);
    } else {
      ChatEngine.loadMessages('channel', channelId);
    }
  }

  showServerSettings() {
    if (Auth.isSuperAdmin()) {
      App.showToast('Sunucu ayarları paneli (Super Admin)', 'success');
    }
  }
}

const ServerManager = new ServerManagerClass();
window.ServerManager = ServerManager;
export { ServerManager };
