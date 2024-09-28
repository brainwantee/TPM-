const { makeBot } = require("./bot.js");
const { getPackets, makePackets } = require("./packets.js");
const { logmc, customIGNColor } = require("../logger.js");
const CoflWs = require("./CoflWs.js");
const StateManager = require("./StateManager.js");
//const { getReady, listItem } = require('./relistHandler.js'); For the future

class AhBot {

    constructor(ign) {
        this.ign = ign;
        this.bot = null;
    }

    async startBot() {
        const { bot, ign } = this //screw "this"

        makePackets(ign, bot._client);
        let packets = getPackets(ign);

        const state = new StateManager();

        bot.on('message', async (message, type) => {
            let text = message.getText(null);
            if (type === 'chat') logmc(`${customIGNColor(ign)}${ign}: ${message.toAnsi()}`);
        })

        const coflSocket = new CoflWs(ign, bot);
        const ws = coflSocket.getWs();

    }

    async createBot() {
        return new Promise(async (resolve) => {
            this.bot = await makeBot(this.ign);
            this.startBot();
            resolve();
        })
    }

    async stopBot() {
        //safety stuff idk
    }

}

module.exports = AhBot;