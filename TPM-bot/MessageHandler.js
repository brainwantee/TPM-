const { logmc, customIGNColor } = require("../logger.js");
let { config } = require('../config.js');

const axios = require('axios');

const soldRegex = /^\[Auction\] (.+?) bought (.+?) for ([\d,]+) coins CLICK$/;
const boughtRegex = /^You purchased (.+?) for ([\d,]+) coins!$/;

class MessageHandler {

    constructor(ign, bot, socket, state) {
        this.ign = ign;
        this.bot = bot;
        this.coflSocket = socket;
        this.ws = socket.getWs();
        this.state = state;
        this.webhookObject = {};//"itemName:pricePaid"
        this.relistObject = {};//auctionID
        this.soldObject = {};//"itemName:target"
        this.ignPrefix = config.igns.length == 0 ? "" : `${customIGNColor(ign)}${ign}: `;
        this.firstGui = null;
        this.privacySettings = /no regex yet but I don't want it to crash so I'm putting regex /;
        this.messageListener();
        this.coflHandler();
    }

    messageListener() {

        let buyspeed = null;
        let oldBuyspeed = null;

        this.bot.on('message', async (message, type) => {
            if (type !== 'chat') return;
            let sentMessage = false;
            let text = message.getText(null);
            if(text.trim() === '') sentMessage = true;
            this.sendChatBatch(text);
            switch (text) {
                case 'Putting coins in escrow...':
                    buyspeed = Date.now() - this.firstGui
                    if (buyspeed == oldBuyspeed) return;
                    oldBuyspeed = buyspeed;
                    logmc(`§6[§bTPM§6] §3Auction bought in ${buyspeed}ms`);
                    this.bot.betterWindowClose();
                    break;
                case "This auction wasn't found!":
                    if (this.state.get() === 'buying') this.state.set(null);
                    break;
                case "The auctioneer has closed this auction!":
                case "You don't have enough coins to afford this bid!":
                    this.state.set(null);
                    this.bot.betterWindowClose();
                    break;
            }

            const boughtMatch = text.match(boughtRegex);
            if (boughtMatch) {
                this.sendScoreboard();
            }

            const soldMatch = text.match(soldRegex);
            if (soldMatch) {
                this.sendScoreboard();
            }

            if (!sentMessage) logmc(`${this.ignPrefix}${message.toAnsi()}`);
        })

    }

    coflHandler() {
        this.ws.on('getInventory', this.sendInventory);
        const settings = msg => {
            this.privacySettings = new RegExp(msg.chatRegex);
            this.ws.off('settings', settings);
        };
        this.ws.on('settings', settings);
    }

    sendInventory = () => {
        this.coflSocket.send(JSON.stringify({
            type: 'uploadInventory',
            data: JSON.stringify(this.bot.inventory)
        }), false);
    };

    sendChatBatch(message) {
        if (this.privacySettings.test(message)) {
            this.coflSocket.send(
                JSON.stringify({
                    type: 'chatBatch',
                    data: JSON.stringify([message]),
                }), false
            );
        }
    }

    setBuySpeed(BINView) {//for autobuy
        this.firstGui = BINView;
    }

    sendScoreboard() {
        setTimeout(() => {
            if (!this.bot?.scoreboard?.sidebar?.items) return;
            let scoreboard = this.bot.scoreboard.sidebar.items.map(item => item.displayName.getText(null).replace(item.name, ''));
            if (scoreboard.find(e => e.includes('Purse:') || e.includes('Piggy:'))) {
                this.coflSocket.send(
                    JSON.stringify({
                        type: 'uploadScoreboard',
                        data: JSON.stringify(scoreboard)
                    }), false
                );
            }
        }, 5500);
    }

}

module.exports = MessageHandler;