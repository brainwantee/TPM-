const { logmc, customIGNColor } = require('../logger.js');
const { config } = require('../config.js');
const { sleep, betterOnce } = require('./Utils.js');
const { getPackets } = require('./packets.js');
const useCookie = config.useCookie;
let otherIsland = useCookie === false ? false : config.visitFriend;

const baseMessage = useCookie ? "Private Island" : "Hub";

class AutoIsland {

    constructor(ign, state, bot) {
        this.ign = ign;
        this.state = state;
        this.bot = bot;
        this.checkLocraw = this.checkLocraw.bind(this);//Idk what this means tbh
        this.bot.on('spawn', this.checkLocraw);
        this.currentlyConfirming = false;
        this.packets = getPackets(ign);
    }

    async checkLocraw(confirm = false) {
        if (this.currentlyConfirming && !confirm) return
        await sleep(15_000);
        this.currentlyConfirming = false;
        this.bot.chat('/locraw');

        const check = async (message, type) => {
            if (type !== 'chat') return;

            try {
                const locraw = JSON.parse(message);
                this.bot.off('message', check);
                if(locraw.server === 'limbo'){
                    this.move('/l');
                } else if (locraw.lobbyname) {
                    this.move('/skyblock');
                } else if (locraw.map !== baseMessage) {
                    //console.log(`Base different`);
                    if (useCookie) {
                        this.move('/is');
                    } else {
                        this.move('/hub');
                    }
                } else if (otherIsland  && otherIsland.trim() !== "") {
                    let scoreboard = this.bot?.scoreboard?.sidebar?.items?.map(item => item?.displayName?.getText(null)?.replace(item?.name, ''));
                    let guests = scoreboard.find(line => line.includes('✌'));
                    let ownIsland = scoreboard.find(line => line.includes('Your Island'));
                    if (!guests || ownIsland) {
                        this.bot.chat(`/visit ${otherIsland}`);
                        await betterOnce(this.bot, 'windowOpen');
                        await sleep(150);
                        const lore = this.bot.currentWindow?.slots[11]?.nbt?.value?.display?.value?.Lore?.value?.value;
                        //console.log(lore);
                        if(lore.includes('§cIsland disallows guests!')){
                            otherIsland = false;
                            console.log(`Hey so this person has invites off :(`);
                            this.checkLocraw();
                        }
                        this.bot.betterClick(11, 0, 0);
                    } else {
                        //console.log('Made it to the island!');
                        this.state.set(null);
                    }
                } else if (this.state.get() === 'moving') {
                    //console.log('Made it to the island!');
                    this.state.set(null);
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

}

module.exports = AutoIsland;   