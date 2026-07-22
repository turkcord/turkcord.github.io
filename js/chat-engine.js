import { Auth } from "./auth.js";
import { db, storage } from "./firebase-config.js";
import {
  collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

class ChatEngineClass {
  constructor() {
    this.unsubscribe = null;
    this.currentType = null;
    this.currentId = null;
  }

  init() {
    // Initial load
  }

  loadMessages(type, id) {
    this.currentType = type;
    this.currentId = id;
    
    if (this.unsubscribe) this.unsubscribe();
    
    const container = document.getElementById('messages-container');
    const mobileContainer = document.getElementById('mobile-messages');
    container.innerHTML = '';
    if (mobileContainer) mobileContainer.innerHTML = '';
    
    let q;
    if (type === 'channel') {
      q = query(collection(db, "messages"), where("channelId", "==", id), orderBy("timestamp", "asc"));
    } else {
      q = query(collection(db, "direct_messages"), where("dmId", "==", id), orderBy("timestamp", "asc"));
    }

    this.unsubscribe = onSnapshot(q, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const msg = { id: change.doc.id, ...change.doc.data() };
          this.renderMessage(msg, container);
          if (mobileContainer) this.renderMessage(msg, mobileContainer);
        }
      });
      container.scrollTop = container.scrollHeight;
      if (mobileContainer) mobileContainer.scrollTop = mobileContainer.scrollHeight;
    });
  }

  renderMessage(msg, container) {
    const div = document.createElement('div');
    div.className = 'message';
    div.id = `msg-${msg.id}`;
    
    const isOwn = msg.senderId === Auth.currentUser?.uid;
    const avatar = msg.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`;
    
    let attachmentsHtml = '';
    if (msg.attachments?.length) {
      attachmentsHtml = '<div class="message-attachments">';
      msg.attachments.forEach(url => {
        if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          attachmentsHtml += `<img src="${url}" alt="attachment" onclick="window.open('${url}')">`;
        } else if (url.match(/\.(mp4|webm|mov)$/i)) {
          attachmentsHtml += `<video src="${url}" controls></video>`;
        }
      });
      attachmentsHtml += '</div>';
    }

    let voiceHtml = '';
    if (msg.voiceNoteURL) {
      voiceHtml = `
        <div class="voice-note">
          <button onclick="this.nextElementSibling.play()"><i class="fa-solid fa-play"></i></button>
          <audio src="${msg.voiceNoteURL}"></audio>
          <div class="voice-note-wave">
            <span style="height:40%"></span><span style="height:70%"></span>
            <span style="height:50%"></span><span style="height:80%"></span>
            <span style="height:60%"></span>
          </div>
          <span style="font-size:11px;color:var(--text-muted)">Sesli Not</span>
        </div>
      `;
    }

    let translateHtml = '';
    if (msg.content && !msg.isTranslated && msg.senderId !== Auth.currentUser?.uid) {
      translateHtml = `
        <div class="message-translate">
          <button onclick="TranslateService.translateMessage('${msg.id}', '${msg.content.replace(/'/g, "\\'")}')">
            <i class="fa-solid fa-language"></i> Türkçe'ye Çevir
          </button>
          <div class="translated-text hidden" id="translated-${msg.id}"></div>
        </div>
      `;
    }

    div.innerHTML = `
      <div class="message-avatar">
        <img src="${avatar}" alt="avatar">
      </div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-author" style="color:${msg.senderColor || 'var(--text-primary)'}">${msg.senderName || 'Bilinmeyen'}</span>
          <span class="message-time">${msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleString('tr-TR') : 'Şimdi'}</span>
        </div>
        <div class="message-body">${this.escapeHtml(msg.content)}</div>
        ${attachmentsHtml}
        ${voiceHtml}
        ${translateHtml}
      </div>
    `;
    
    container.appendChild(div);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
      .replace(/\n/g, '<br>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:var(--primary-color)">$1</a>');
  }

  async sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    if (!content || !Auth.currentUser) return;

    await this.send(content);
    input.value = '';
  }

  async sendMessageMobile() {
    const input = document.getElementById('mobile-message-input');
    const content = input.value.trim();
    if (!content || !Auth.currentUser) return;

    await this.send(content);
    input.value = '';
  }

  async send(content, extras = {}) {
    const msgData = {
      senderId: Auth.currentUser.uid,
      senderName: Auth.userData?.displayName || 'Kullanıcı',
      senderAvatar: Auth.userData?.photoURL,
      content,
      timestamp: serverTimestamp(),
      ...extras
    };

    if (this.currentType === 'channel') {
      msgData.channelId = this.currentId;
      await addDoc(collection(db, "messages"), msgData);
    } else {
      msgData.dmId = this.currentId;
      await addDoc(collection(db, "direct_messages"), msgData);
    }

    // Bot trigger check
    BotEngine.checkTriggers(content, this.currentId);
  }

  async handleFileUpload(input) {
    if (!input.files?.[0]) return;
    const file = input.files[0];
    
    try {
      const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      await this.send('', { attachments: [url] });
      App.showToast('Dosya gönderildi!', 'success');
    } catch (err) {
      App.showToast('Dosya yüklenirken hata.', 'error');
    }
    input.value = '';
  }

  async sendVoiceNote(blob) {
    try {
      const storageRef = ref(storage, `voice_notes/${Date.now()}.webm`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      
      await this.send('🎙️ Sesli Not', { voiceNoteURL: url });
    } catch (err) {
      App.showToast('Sesli not gönderilemedi.', 'error');
    }
  }

  loadVoiceChannel(channelId) {
    const container = document.getElementById('messages-container');
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-headset" style="font-size:64px;color:var(--primary-color)"></i>
        <h3>Ses Kanalı</h3>
        <p>Bu kanala katılmak için aşağıdaki butona tıklayın.</p>
        <button class="btn btn-primary" onclick="VoiceEngine.joinChannel('${channelId}')" style="margin-top:16px">
          <i class="fa-solid fa-phone"></i> Kanala Katıl
        </button>
      </div>
    `;
  }

  updateTranslatedText(msgId, translated) {
    const el = document.getElementById(`translated-${msgId}`);
    if (el) {
      el.textContent = translated;
      el.classList.remove('hidden');
    }
  }
}

const ChatEngine = new ChatEngineClass();
window.ChatEngine = ChatEngine;
export { ChatEngine };
