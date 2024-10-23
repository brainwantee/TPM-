const { makeBot } = require("./bot.js");
const { getPackets } = require("./packets.js");
const { debug } = require("../logger.js");
const { config } = require('../config.js');
const { getStats, getPingStats, sendDiscord } = require('./Utils.js');
const CoflWs = require("./CoflWs.js");
const StateManager = require("./StateManager.js");
const AutoIsland = require('./AutoIsland.js');
const MessageHandler = require('./MessageHandler.js');
const AutoBuy = require('./AutoBuy.js');
const RelistHandler = require('./RelistHandler.js');
const { igns, webhookFormat } = config;


class AhBot {

    constructor(ign, TPMSocket) {
        this.ign = ign;
        this.bot = null;
        this.autoBuy = null;
        this.webhook = null;
        this.ws = null;
        this.coflSocket = null;
        this.island = null;
        this.state = null;
        this.packets = null;
        this.sold = 0;
        this.bought = [];
        this.tpm = TPMSocket;
        this.start = Date.now();

        this.updateBought = this.updateBought.bind(this);
        this.updateSold = this.updateSold.bind(this);//this whole binding thing is getting annoying
    }

    async startBot() {
        const { bot, ign, tpm } = this //screw "this"

        let packets = getPackets(ign);

        const state = new StateManager(bot);

        const coflSocket = new CoflWs(ign, bot);
        const ws = coflSocket.getWs();

        const relist = new RelistHandler(bot, state, tpm, this.updateSold);

        const island = new AutoIsland(ign, state, bot);

        const webhook = new MessageHandler(ign, bot, coflSocket, state, relist, island, this.updateSold, this.updateBought);

        const autoBuy = new AutoBuy(bot, webhook, ws, ign, state, relist);

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
            case "/stats":
                getStats(this.bot, this.coflSocket.handleCommand, this.ws, this.sold, this.bought, this.start);
                break;
            case "/ping":
                getPingStats(this.bot, this.coflSocket.handleCommand, this.ws, this.sold, this.bought);
                break;
            case "/test":
                sendDiscord({
                    title: 'LEGENDARY FLIP WOOOOO!!!',
                    color: 16629250,
                    fields: [
                        {
                            name: '',
                            value: this.formatString(webhookFormat, 'Hyperion', '1.7B', '100,000', '1.7B', '50', "NUGGET", "Craft Cost", ),
                        }
                    ],
                    thumbnail: {
                        url: `https://mc-heads.net/head/${this.bot.uuid}.png`,
                    },
                    footer: {
                        text: `TPM Rewrite - Found by ${finder} - Purse ${formatNumber(this.bot.getPurse(true) - parseInt(priceNoCommas, 10))}`,
                        icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
                    }
                }, true)
        }
    }

    initAskPrefix(sub = 3) {
        if (igns.length == 1) return null;

        let thisPrefix = this.ign.substring(0, sub);
        debug(`|${thisPrefix}|`)
        try {
            igns.forEach(ign => {
                if (ign.substring(0, sub) == thisPrefix && ign !== this.ign) sex//i forgot how to throw errors and this is faster than looking it up
            })
        } catch {
            debug(`retrying`)
            return this.initAskPrefix(++sub);
        }

        return thisPrefix;
    }

    getBot() {
        return this.bot;
    }

    updateSold() {
        this.sold++;
    }

    updateBought(profit) {
        this.bought.push(profit);
    }
}

module.exports = AhBot;
