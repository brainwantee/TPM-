const { getPackets } = require('./packets.js');
const { config } = require('../config.js');
const { stripItemName, IHATETAXES } = require('./Utils.js');
const { logmc } = require('../logger.js');
const { useBaf, delay } = config.useBaf;

class AutoBuy {

    constructor(bot, WebhookManager, ws, ign, state) {
        this.bot = bot;
        this.webhook = WebhookManager;
        this.ws = ws;
        this.ign = ign;
        this.flipHandler();
        this.recentProfit = 0;
        this.recentFinder = 0;
        this.bedFailed = false;
        this.state = state;
        this.currentOpen = null;
    }

    async flipHandler() {
        const { webhook, bot, ws, ign, state } = this;
        const packets = getPackets(ign);

        bot._client.on('window_open', (window) => {
            const windowID = window.windowId;
            const nextWindowID = windowID === 100 ? 1 : windowID + 1
            const windowName = window.windowTitle;
        })

        ws.on('flip', (data) => {
            let bed = 'BED';
            let currentTime = Date.now();
            const currentState = state.get();
            const stateCheck = currentState === null;
            const lastUpdated = currentTime - state.getTime() > delay;
            const windowCheck = !bot.currentWindow
            const ready = windowCheck && lastUpdated && stateCheck;
            if (useBaf) {
                auctionID = data.id;
                if (ready) packets.sendMessage(`/viewauction ${auctionID}`);//Put this earlier so that it doens't get slowed down (but it's kinda ugly :( )
                const { finder, purchaseAt, target, startingBid, tag, itemName } = data;//I hate this :(
                let weirdItemName = stripItemName(itemName);
                let profit = IHATETAXES(target) - startingBid; 
                if (ready) {
                    logmc(`[TPM] Opening ${itemName}`);
                    this.currentOpen = auctionID;
                    this.recentProfit = profit;
                    this.recentFinder = finder;
                    this.bedFailed = false;
                    state.set('buying');
                } else if (currentState !== 'moving') {
                    let reasons = [];
                    if(!windowCheck) reasons.push(`${bot.currentWindow} is open`);
                    if(!windowCheck) reasons.push(`${bot.currentWindow} is open`);
                    if(!windowCheck) reasons.push(`${bot.currentWindow} is open`);
                    logmc(`[TPM] ${itemName} added to pipeline because ${reasons.join(' and ')}`);
                }
            } else {
                if (ready) {

                } else {

                }
            }
        })

    }

    async itemLoad(slot, alreadyLoaded = false) {
        return new Promise((resolve, reject) => {
            let index = 1;
            const first = bot.currentWindow?.slots[slot]?.name;
            const interval = alreadyLoaded ? setInterval(() => {
                const check = bot.currentWindow?.slots[slot];
                if (check?.name !== first) {
                    clearInterval(interval);
                    resolve(check);
                    debug(`Found ${check?.name} on ${index}`);
                }
                index++
            }, 1) : setInterval(() => {
                const check = bot.currentWindow?.slots[slot];
                if (check) {
                    clearInterval(interval);
                    resolve(check);
                    debug(`Found ${check?.name} on ${index}`);
                }
                index++
            }, 1);

            setTimeout(() => {
                clearInterval(interval);
                reject(new Error(`Item didn't load in time :(`));
            }, 5000);
        });
    }

    openExternalFlip(ahid, profit,) {

    }

}

module.exports = AutoBuy;