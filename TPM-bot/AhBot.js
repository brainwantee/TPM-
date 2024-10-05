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
const { igns } = config;


class AhBot {

    constructor(ign) {
        this.ign = ign;
        this.bot = null;
        this.autoBuy = null;
        this.webhook = null;
        this.ws = null;
        this.coflSocket = null;
        this.island = null;
        this.state = null;
        this.packets = null;
    }

    async startBot() {
        const { bot, ign } = this //screw "this"

        let packets = getPackets(ign);

        const state = new StateManager();

        const coflSocket = new CoflWs(ign, bot);
        const ws = coflSocket.getWs();

        const webhook = new MessageHandler(ign, bot, coflSocket, state);

        const island = new AutoIsland(ign, state, bot, webhook);

        const autoBuy = new AutoBuy(bot, webhook, ws, ign, state);

        this.autoBuy = autoBuy;
        this.webhook = webhook;
        this.ws = ws;
        this.coflSocket = coflSocket;
        this.island = island;
        this.state = state;
        this.packets = packets;

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

    handleTerminal(command, message) {
        switch (command) {
            case 'chat':
                this.packets?.sendMessage(message);
                break;
            case '/cofl':
            case "/tpm":
            case '/icymacro':
                this.coflSocket.handleCommand(`/cofl ${message}`);
                break;
            case "/fc":
                this.coflSocket.handleCommand(`/cofl chat ${message}`);
                break;
        }
    }

    initAskPrefix(sub = 3) {
        if (igns.length == 1) return null;

        let thisPrefix = this.ign.substring(0, sub);
        console.log(`|${thisPrefix}|`)
        try {
            igns.forEach(ign => {
                if (ign.substring(0, sub) == thisPrefix && ign !== this.ign) sex//i forgot how to throw errors and this is faster than looking it up
            })
        } catch {
            console.log(`retrying`)
            return this.initAskPrefix(++sub);
        }

        return thisPrefix;
    }

    getBot(){
        return this.bot;
    }

}

module.exports = AhBot;
