import { Auth } from "./auth.js";
import { db } from "./firebase-config.js";
import {
  collection, addDoc, getDocs, query, where, doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class BotEngineClass {
  constructor() {
    this.bots = [];
    this.currentBot = null;
    this.badWords = ['küfür1', 'küfür2', 'spam', 'salak', 'aptal']; // Expand as needed
  }

  async createBot() {
    const name = document.getElementById('bot-name').value.trim();
    const prefix = document.getElementById('bot-prefix').value.trim() || '!';
    
    if (!name) {
      App.showToast('Bot adı zorunludur.', 'error');
      return;
    }

    try {
      const token = this.generateToken();
      const botRef = await addDoc(collection(db, "bots"), {
        botName: name,
        botAvatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
        prefix,
        token,
        ownerId: Auth.currentUser.uid,
        serverId: App.currentServer !== 'home' ? App.currentServer : null,
        commands: [],
        autoMod: true,
        welcomeMessage: true,
        createdAt: serverTimestamp()
      });

      this.currentBot = { id: botRef.id, botName: name, prefix, token };
      document.getElementById('webhook-url').textContent = 
        `https://turkcord-offical.web.app/api/webhook/${token}`;
      
      App.showToast(`"${name}" botu oluşturuldu!`, 'success');
      this.loadCommands();
    } catch (err) {
      App.showToast('Bot oluşturulurken hata.', 'error');
    }
  }

  generateToken() {
    return 'tc_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async addCommand() {
    if (!this.currentBot) {
      App.showToast('Önce bir bot oluşturun.', 'error');
      return;
    }

    const trigger = document.getElementById('cmd-trigger').value.trim();
    const response = document.getElementById('cmd-response').value.trim();
    const isEmbed = document.getElementById('cmd-embed').checked;

    if (!trigger || !response) {
      App.showToast('Tetikleyici ve yanıt zorunludur.', 'error');
      return;
    }

    const command = { trigger, response, isEmbed, createdAt: new Date() };
    
    try {
      const botRef = doc(db, "bots", this.currentBot.id);
      const botDoc = await getDocs(query(collection(db, "bots"), where("__name__", "==", this.currentBot.id)));
      
      // Update locally for demo
      if (!this.currentBot.commands) this.currentBot.commands = [];
      this.currentBot.commands.push(command);
      
      await updateDoc(botRef, {
        commands: this.currentBot.commands
      });

      this.renderCommand(command);
      document.getElementById('cmd-trigger').value = '';
      document.getElementById('cmd-response').value = '';
      App.showToast('Komut eklendi!', 'success');
    } catch (err) {
      App.showToast('Komut eklenirken hata.', 'error');
    }
  }

  renderCommand(cmd) {
    const list = document.getElementById('commands-list');
    const div = document.createElement('div');
    div.className = 'command-item';
    div.innerHTML = `
      <div>
        <code>${cmd.trigger}</code> → ${cmd.isEmbed ? '<span class="badge badge-bot">EMBED</span>' : ''} ${cmd.response}
      </div>
      <i class="fa-solid fa-trash" style="color:var(--danger);cursor:pointer;"></i>
    `;
    list.appendChild(div);
  }

  loadCommands() {
    const list = document.getElementById('commands-list');
    list.innerHTML = '';
    if (this.currentBot?.commands) {
      this.currentBot.commands.forEach(cmd => this.renderCommand(cmd));
    }
  }

  async checkTriggers(content, channelId) {
    // Auto-moderation
    const lower = content.toLowerCase();
    if (this.badWords.some(word => lower.includes(word))) {
      App.showToast('Otomatik moderasyon: Uygunsuz içerik tespit edildi.', 'warning');
      return;
    }

    // Bot command check
    if (!this.currentBot || !this.currentBot.commands) return;
    
    for (const cmd of this.currentBot.commands) {
      if (content.startsWith(cmd.trigger)) {
        await this.executeCommand(cmd, channelId);
      }
    }
  }

  async executeCommand(cmd, channelId) {
    const { ChatEngine } = await import("./chat-engine.js");
    
    if (cmd.isEmbed) {
      // Send as system/bot message with embed styling
      await ChatEngine.send(`🤖 **${this.currentBot.botName}**\n${cmd.response}`, {
        senderName: this.currentBot.botName,
        senderAvatar: this.currentBot.botAvatar,
        senderId: 'bot_' + this.currentBot.id
      });
    } else {
      await ChatEngine.send(cmd.response, {
        senderName: this.currentBot.botName,
        senderAvatar: this.currentBot.botAvatar,
        senderId: 'bot_' + this.currentBot.id
      });
    }
  }

  // Discord Bridge compatibility
  async handleWebhook(token, payload) {
    const q = query(collection(db, "bots"), where("token", "==", token));
    const snap = await getDocs(q);
    
    if (snap.empty) return { error: 'Invalid token' };
    
    const bot = snap.docs[0].data();
    
    if (payload.content) {
      const { ChatEngine } = await import("./chat-engine.js");
      await ChatEngine.send(payload.content, {
        senderName: bot.botName,
        senderAvatar: bot.botAvatar,
        senderId: 'bot_' + snap.docs[0].id
      });
    }
    
    return { success: true };
  }
}

const BotEngine = new BotEngineClass();
window.BotEngine = BotEngine;
export { BotEngine };

