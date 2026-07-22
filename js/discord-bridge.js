import { BotEngine } from "./bot-engine.js";

class DiscordBridgeClass {
  constructor() {
    this.baseUrl = window.location.origin;
  }

  // Simulated webhook endpoint handler
  // In production, this would be a Cloud Function
  async receiveWebhook(token, data) {
    return await BotEngine.handleWebhook(token, data);
  }

  generateDiscordJSExample(token) {
    return `
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Forward to Türkcord
  await fetch('${this.baseUrl}/api/webhook/${token}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: message.content,
      author: message.author.tag,
      channelId: message.channelId
    })
  });
});

client.login('YOUR_DISCORD_BOT_TOKEN');
    `.trim();
  }
}

const DiscordBridge = new DiscordBridgeClass();
export { DiscordBridge };
