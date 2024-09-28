const { makeBot } = require("./bot.js");
const { getPackets, makePackets } = require("./packets.js");
const { logmc, customIGNColor } = require("../logger.js");
const CoflWs = require("./CoflWs.js");
const StateManager = require("./StateManager.js");
const AutoIsland = require('./AutoIsland.js');
//const { getReady, listItem } = require('./relistHandler.js'); For the future

class AhBot {

    constructor(ign) {
        this.ign = ign;
        this.bot = null;
    }

    async startBot() {
        const { bot, ign } = this //screw "this"

        bot.betterClick = function (slot, mode1 = 0, mode2 = 0) {
            if (!bot.currentWindow) {
                console.log(`No window found for clicking ${slot}`);
                return;
            }
            let packets = getPackets(bot.username);
            if (!packets) {
                console.log(`Packets weren't made for betterclick`);
                return;
            }
            packets.bump();
            bot.currentWindow.requiresConfirmation = false;
            console.log(`Hi I'm clicking`)
            bot.clickWindow(slot, mode1, mode2);
        };

        makePackets(ign, bot._client);
        let packets = getPackets(ign);

        const state = new StateManager();

        const island = new AutoIsland(ign, state, bot);

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