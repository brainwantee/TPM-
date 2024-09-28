const axios = require('axios');

class WebhookManager {
    constructor(ign, bot) {
        this.ign = ign;
        this.bot = bot;
        this.webhookObject = {};
    }
}

module.exports = WebhookManager;