const { makeBot } = require("./bot.js");
const { getPackets, makePackets } = require("./packets.js");
//const { getReady, listItem } = require('./relistHandler.js'); For the future

class AhBot {

    constructor(ign) {
        this.ign = ign,
        this.bot = null;
    }

    async startBot() {
        const { bot, ign } = this //screw "this"

        makePackets(ign, bot._client);
        let packets = getPackets(ign);

        bot.on('message', async (message, type) => {
            let text = message.getText(null);
            if (type === 'chat') console.log(`${ign}: ${message.toAnsi()}`)
        })

    }

    async createBot() {
        return new Promise(async (resolve) =>{
            this.bot = await makeBot(this.ign);
            this.startBot();
            resolve();
        })
    }

}

module.exports = AhBot;