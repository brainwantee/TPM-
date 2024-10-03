const { makeBot } = require("./bot.js");
const { getPackets, makePackets } = require("./packets.js");
const { logmc, customIGNColor } = require("../logger.js");
const { config } = require('../config.js');
const CoflWs = require("./CoflWs.js");
const StateManager = require("./StateManager.js");
const AutoIsland = require('./AutoIsland.js');
const MessageHandler = require('./MessageHandler.js');
const AutoBuy = require('./AutoBuy.js');
//const { getReady, listItem } = require('./relistHandler.js'); For the future

class AhBot {

    constructor(ign) {
        this.ign = ign;
        this.bot = null;
    }

    async startBot() {
        const { bot, ign } = this //screw "this"

        let packets = getPackets(ign);

        const state = new StateManager();

        const island = new AutoIsland(ign, state, bot);

        const coflSocket = new CoflWs(ign, bot);
        const ws = coflSocket.getWs();

        const webhook = new MessageHandler(ign, bot, coflSocket, state);

        const autoBuy = new AutoBuy(bot, webhook, ws, ign, state);

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