const { logmc, customIGNColor } = require('../logger.js');
const { config } = require('../config.js');
const { sleep, betterOnce, getSlotLore } = require('./Utils.js');
const { getPackets } = require('./packets.js');

class AutoIsland {

    constructor(ign, state, bot) {
        this.ign = ign;
        this.state = state;
        this.bot = bot;
        this.currentlyConfirming = true;
        this.checkLocraw = this.checkLocraw.bind(this);//Idk what this means tbh
        this.bot.on('spawn', this.checkLocraw);
        this.checkLocraw(true);//Sometimes AutoIsland gets made after the bot spawned so we have to make it confirm first
        this.packets = getPackets(ign);
        this.gottenReady = false;
        this.useCookie = config.useCookie;
        this.baseMessage = this.useCookie ? "Private Island" : "Hub";
        this.otherIsland = this.useCookie === false ? false : config.visitFriend;
    }

    async checkLocraw(confirm = false) {
        console.log(`Move check: confirming: ${this.currentlyConfirming}. Instance ${confirm}. Evaluate ${this.currentlyConfirming && !confirm}`);
        if (this.currentlyConfirming && !confirm) return;
        await sleep(20_000);
        this.currentlyConfirming = false;
        this.bot.chat('/locraw');

        const check = async (message, type) => {
            if (type !== 'chat') return;

            try {
                const locraw = JSON.parse(message);
                this.bot.off('message', check);
                if (locraw.server === 'limbo') {
                    this.move('/l');
                } else if (locraw.lobbyname) {
                    this.move('/skyblock');
                } else if (locraw.map !== this.baseMessage) {
                    //console.log(`Base different`);
                    if (this.useCookie) {
                        this.move('/is');
                    } else {
                        this.move('/hub');
                    }
                } else if (this.otherIsland && this.otherIsland.trim() !== "") {
                    let scoreboard = this.bot?.scoreboard?.sidebar?.items?.map(item => item?.displayName?.getText(null)?.replace(item?.name, ''));
                    let guests = scoreboard.find(line => line.includes('✌'));
                    let ownIsland = scoreboard.find(line => line.includes('Your Island'));
                    if (!guests || ownIsland) {
                        this.bot.chat(`/visit ${this.otherIsland}`);
                        await betterOnce(this.bot, 'windowOpen');
                        await sleep(150);
                        const lore = getSlotLore(this.bot.currentWindow?.slots[11]);
                        //console.log(lore);
                        if (lore.includes('§cIsland disallows guests!')) {
                            this.otherIsland = false;
                            console.log(`Hey so this person has invites off :(`);
                            this.checkLocraw();
                        }
                        this.bot.betterClick(11, 0, 0);
                    } else {
                        //console.log('Made it to the island!');
                        if (this.gottenReady) {
                            this.state.set(null);
                        } else {
                            this.state.set('getting ready');
                            this.gottenReady = true;
                        }
                    }
                } else if (this.state.get() === 'moving') {
                    //console.log('Made it to the island!');
                    if (this.gottenReady) {
                        this.state.set(null);
                    } else {
                        this.state.set('getting ready');
                        this.gottenReady = true;
                    }

                }
            } catch (e) {
                console.error(e);
            };
        }

        this.bot.on('message', check);

        setTimeout(() => {
            this.bot.off('message', check);
        }, 5000)
    }

    async move(place) {
        await sleep(3000);
        console.log(`Moving to ${place}`);
        this.packets.sendMessage(place);
        this.state.set('moving');
        this.currentlyConfirming = true;
        this.checkLocraw(true);//confirm we made it
    }

    setIsland(otherIsland, baseMessage, useCookie){
        this.otherIsland = otherIsland;
        this.baseMessage = baseMessage;
        this.useCookie = useCookie;
        this.checkLocraw();
    }

}

module.exports = AutoIsland;   