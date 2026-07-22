import { ChatEngine } from "./chat-engine.js";

class VoiceEngineClass {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordStartTime = null;
    this.recordTimer = null;
    this.isRecording = false;
    this.localStream = null;
    this.peerConnection = null;
  }

  startRecording() {
    if (this.isRecording) return;
    this.isRecording = true;
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.mediaRecorder = new MediaRecorder(stream);
        this.recordedChunks = [];
        
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.recordedChunks.push(e.data);
        };
        
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
          ChatEngine.sendVoiceNote(blob);
          stream.getTracks().forEach(t => t.stop());
        };
        
        this.mediaRecorder.start();
        this.showRecordingUI();
      })
      .catch(() => {
        App.showToast('Mikrofon erişimi reddedildi.', 'error');
        this.isRecording = false;
      });
  }

  stopRecording(save) {
    if (!this.isRecording || !this.mediaRecorder) return;
    this.isRecording = false;
    
    clearInterval(this.recordTimer);
    document.getElementById('voice-recording-ui').classList.add('hidden');
    document.getElementById('normal-input').classList.remove('hidden');
    
    if (save && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    } else if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.recordedChunks = [];
    }
  }

  showRecordingUI() {
    document.getElementById('normal-input').classList.add('hidden');
    document.getElementById('voice-recording-ui').classList.remove('hidden');
    
    let seconds = 0;
    const timer = document.getElementById('recording-timer');
    this.recordTimer = setInterval(() => {
      seconds++;
      const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      timer.textContent = `${mins}:${secs}`;
      
      if (seconds >= 300) this.stopRecording(true); // Max 5 min
    }, 1000);
  }

  async joinChannel(channelId) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      App.showToast('Ses kanalına katıldınız!', 'success');
      
      // WebRTC signaling would go here via Firebase RTDB
      // For now, basic implementation
      this.setupPeerConnection(channelId);
    } catch (err) {
      App.showToast('Ses cihazına erişilemedi.', 'error');
    }
  }

  setupPeerConnection(channelId) {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });
    
    // Firebase RTDB signaling integration would be here
    console.log('WebRTC initialized for channel:', channelId);
  }

  leaveChannel() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.peerConnection?.close();
    this.localStream = null;
    this.peerConnection = null;
    App.showToast('Ses kanalından ayrıldınız.', 'success');
  }
}

const VoiceEngine = new VoiceEngineClass();
window.VoiceEngine = VoiceEngine;
export { VoiceEngine };
