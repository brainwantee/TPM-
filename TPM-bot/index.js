const { createBot } = require("mineflayer");

class AhBot {

    constructor(ign) {
        this.ign = ign;
        this.bot;
    }

    async startBot() {
        const {ign, bot} = this;

        
    }

    async createBot(){
        return new Promise((resolve, reject) => {
            console.log(`Trying to log into ${this.ign}`);

            this.bot = createBot({
                username: this.ign,
                auth: 'microsoft',
                version: '1.8.9',
                host: 'play.hypixel.net',
            });
            
            this.bot.once("login", () => {
                console.log(`${this.ign} logged in!`);
                this.startBot();
                resolve();
            });

        })
    }

}

module.exports = AhBot;