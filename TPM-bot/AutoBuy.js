const { getPackets } = require('./packets.js');
const { config } = require('../config.js');
const { stripItemName, IHATETAXES, normalizeDate, getWindowName, isSkin, sleep } = require('./Utils.js');
const { logmc } = require('../logger.js');
const { delay, waittime, skip: skipSettings, clickDelay } = config;
const { always: useSkip, minProfit: skipMinProfit, userFinder: skipUser, skins: skipSkins } = skipSettings;

class AutoBuy {

    constructor(bot, WebhookManager, ws, ign, state) {
        this.bot = bot;
        this.webhook = WebhookManager;
        this.ws = ws;
        this.ign = ign;
        this.state = state;
        this.recentProfit = 0;
        this.recentFinder = 0;
        this.recentlySkipped = false;
        this.recentName = null;
        this.bedFailed = false;
        this.currentOpen = null;
        this.flipHandler();
    }

    async flipHandler() {
        const { webhook, bot, ws, ign, state } = this;
        const packets = getPackets(ign);
        let firstGui;

        bot._client.on('open_window', async (window) => {
            const windowID = window.windowId;
            const nextWindowID = windowID === 100 ? 1 : windowID + 1
            const windowName = window.windowTitle;
            logmc(`Got new window ${windowName}, ${windowID}`);
            packets.confirmClick(windowID);
            if (windowName === '{"italic":false,"extra":[{"text":"BIN Auction View"}],"text":""}' && bot.state !== 'listing') {
                const finderCheck = this.recentFinder === "USER" && skipUser;
                const skinCheck = isSkin(this.recentName) && skipSkins;
                const profitCheck = this.recentProfit > skipMinProfit;
                let useSkipOnFlip = profitCheck || skinCheck || finderCheck || useSkip;
                firstGui = Date.now();
                webhook.setBuySpeed(firstGui);
                let item = (await this.itemLoad(31)).name;
                if (item === 'gold_nugget') {
                    packets.click(31, windowID, 371);
                    bot.betterClick(31, 0, 0);
                    if (useSkipOnFlip) {
                        packets.click(11, nextWindowID, 159);
                        this.recentlySkipped = true;
                        if (useSkip) {
                            logmc(`§6[§bTPM§6] §8Used skip because you have useSkip enabled in config`);
                            return;
                        }
                        let skipReasons = [];
                        if (finderCheck) skipReasons.push('it was a user flip');
                        if (finderCheck) skipReasons.push('it was over skip min profit');
                        if (finderCheck) skipReasons.push('it was a skin');
                        logmc(`§6[§bTPM§6] §8Used skip because ${skipReasons.join(' and ')}. You can change this in your config`);
                    } else {
                        this.recentlySkipped = false;
                    }
                } else if (item !== 'bed') {
                    bot.closeWindow(window);
                    state.set(null);
                } else {
                    this.initBedSpam();
                }

            } else if (windowName === '{"italic":false,"extra":[{"text":"Confirm Purchase"}],"text":""}') {
                let confirmAt = Date.now() - firstGui;
                logmc(`§6[§bTPM§6] §3Confirm at ${confirmAt}ms`);
                if (!this.recentlySkipped) bot.betterClick(11, 0, 0);
                state.set(null);
            }
            await sleep(500);
            webhook.sendInventory();
        })

        ws.on('flip', (data) => {
            let currentTime = Date.now();
            const currentState = state.get();
            const stateCheck = currentState === null;
            const lastUpdated = currentTime - state.getTime() > delay;
            const windowCheck = !bot.currentWindow;
            const ready = windowCheck && lastUpdated && stateCheck;
            let auctionID = data.id;
            if (ready) packets.sendMessage(`/viewauction ${auctionID}`);//Put this earlier so that it doesn't get slowed down (but it's kinda ugly :( )
            const { finder, purchaseAt, target, startingBid, tag, itemName } = data;//I hate this :(
            let weirdItemName = stripItemName(itemName);
            let profit = IHATETAXES(target) - startingBid;
            let ending = new Date(normalizeDate(purchaseAt)).getTime();
            if (ready) {
                logmc(`§6[§bTPM§6] §8Opening ${itemName}`);
                this.currentOpen = auctionID;
                this.recentProfit = profit;
                this.recentFinder = finder;
                this.recentName = itemName;
                this.bedFailed = false;
                state.set('buying');
                if (currentTime < ending) {
                    this.timeBed(ending, auctionID);
                    //add webhook here
                }
            } else if (currentState !== 'moving') {
                let reasons = [];
                if (!windowCheck) reasons.push(`${getWindowName(bot.currentWindow)} is open`);
                if (!stateCheck) reasons.push(`state is ${currentState}`);
                if (!lastUpdated) reasons.push(`last action was too recent`);
                state.queueAdd({ finder, profit, tag, itemName }, 'buying', 0);
                logmc(`§6[§bTPM§6] §3${itemName}§3 added to pipeline because ${reasons.join(' and ')}!`);
            } else {
                logmc(`§6[§bTPM§6] §cCan't open flips while moving :(`);
            }
            logmc(`Found flip ${auctionID}`);
        })

    }

    async itemLoad(slot, alreadyLoaded = false) {
        return new Promise((resolve, reject) => {
            const { bot } = this;
            let index = 1;
            const first = bot.currentWindow?.slots[slot]?.name;
            const interval = alreadyLoaded ? setInterval(() => {
                const check = bot.currentWindow?.slots[slot];
                if (check?.name !== first) {
                    clearInterval(interval);
                    resolve(check);
                    logmc(`Found ${check?.name} on ${index}`);
                }
                index++
            }, 1) : setInterval(() => {
                const check = bot.currentWindow?.slots[slot];
                if (check) {
                    clearInterval(interval);
                    resolve(check);
                    logmc(`Found ${check?.name} on ${index}`);
                }
                index++
            }, 1);

            setTimeout(() => {
                clearInterval(interval);
                resolve(null);
            }, 5000);
        });
    }

    openExternalFlip(ahid, profit) {

    }

    async timeBed(ending, currentID) {
        const start = Date.now();

        await sleep(ending - start - waittime);
        for (let i = 0; i < 5; i++) {
            if (getWindowName(this.bot.currentWindow)?.includes('BIN Auction View') && this.currentOpen === currentID) {
                this.bot.betterClick(31, 0, 0);
                console.log(`Bed click`);
                await sleep(3);
            } else {
                break;
            }
        }

        await sleep(5000);
        if (getWindowName(this.bot.currentWindow)?.includes('BIN Auction View') && this.currentOpen === currentID) {
            this.bot.closeWindow(this.bot.currentWindow);
            this.state.set(null);
            logmc(`§6[§bTPM§6] §cBed timing failed and we had to abort the auction :( Please lower your waittime if this continues or turn on bedspam`);
        }

    }

    initBedSpam() {
        const bedSpam = setInterval(async () => {
            const window = this.bot.currentWindow;
            const item = (await this.itemLoad(31))?.name
            if ((!this.bedFailed && !config.bedSpam) || getWindowName(window) !== 'BIN Auction View' || item !== 'bed') {
                clearInterval(bedSpam);
                console.log(`Clering  bed spam`,this.bedFailed, config.bedSpam, getWindowName(window), item )
                return;
            };
            this.bot.betterClick(31, 0, 0);
            console.log('doing bedspam')
        }, config.clickDelay)
    }

}

module.exports = AutoBuy;