const { createBot } = require("mineflayer");

class AhBot {

    constructor(ign) {
        this.ign = ign;
    }

    async startBot() {
        const bot = createBot({
            username: this.ign,
            auth: 'microsoft',
            version: '1.8.9',
            host: 'play.hypixel.net',
        });

        bot.once("login", () => {
            console.log(`${this.ign} logged in!`);
        });

    }

}

module.exports = AhBot;