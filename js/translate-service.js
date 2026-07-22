class TranslateServiceClass {
  constructor() {
    // Public LibreTranslate instances (rate-limited, for demo)
    this.endpoints = [
      'https://libretranslate.de/translate',
      'https://translate.argosopentech.com/translate'
    ];
    this.currentEndpoint = 0;
  }

  async translateMessage(msgId, text) {
    if (!text || text.trim().length < 2) return;
    
    App.showToast('Çevriliyor...', 'info');
    
    try {
      const res = await fetch(this.endpoints[this.currentEndpoint], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: 'auto',
          target: 'tr',
          format: 'text'
        })
      });
      
      if (!res.ok) throw new Error('API error');
      
      const data = await res.json();
      const translated = data.translatedText || data.translation || 'Çeviri başarısız';
      
      // Update UI
      ChatEngine.updateTranslatedText(msgId, translated);
      App.showToast('Çeviri tamamlandı!', 'success');
      
    } catch (err) {
      // Fallback: rotate endpoint
      this.currentEndpoint = (this.currentEndpoint + 1) % this.endpoints.length;
      App.showToast('Çeviri hatası. Tekrar deneyin.', 'error');
    }
  }
}

const TranslateService = new TranslateServiceClass();
window.TranslateService = TranslateService;
export { TranslateService };
