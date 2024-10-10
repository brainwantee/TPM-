const { config } = require('../config.js');
const { sleep, betterOnce, getWindowName, noColorCodes } = require('./Utils.js');
const { useCookie, relist } = config;

const coopRegexPlayers = /Co-op with (\d+) players:/;
const coopRegexSinglePlayer = /Co-op with (?:\[.*\]\s*)?([\w]+)/;

class RelistHandler {

    constructor(bot, state) {
        this.bot = bot;
        this.state = state;
        this.useRelist = relist;
        this.currentAuctions = null;
        this.maxSlots = 14;
        this.getReady();
    }

    declineSoldAuction() {

    }

    getReady() {
        if (!useCookie) return;
        const { bot, state } = this;
        try {
            var check = async () => {
                await sleep(20_500);
                if (state.get() == null) {
                    state.set('getting ready');
                    console.log('getting ready!')
                    bot.off('spawn', check);
                    bot.chat('/profiles');
                    await betterOnce(bot, "windowOpen");
                    const profileLore = bot.currentWindow?.slots?.find(block => block?.name === 'emerald_block').nbt.value.display.value.Lore.value.value;
                    let coopLine = profileLore.find(line => line.includes('Co-op with'));
                    if (coopLine) {
                        coopLine = noColorCodes(coopLine);
                        const singleMatch = coopLine.match(coopRegexSinglePlayer);
                        const multiMatch = coopLine.match(coopRegexPlayers);
                        if (multiMatch) {
                            const numberOfPlayers = parseInt(multiMatch[1]);
                            this.maxSlots += numberOfPlayers * 3;
                        } else if (singleMatch) {
                            this.maxSlots += 3;
                        } else {
                            console.error('wtf is your coop', profileLore);
                        }
                    }

                    console.log(`max slots set to ${this.maxSlots}`)

                } else {
                    console.log('not getting ready!!!');
                }
            }
        } catch (e) {
            console.error(`Error getting relist ready! Not going to use relist for ${bot.ign}`, e);
            this.useRelist = false;
        }

        bot.on('spawn', check);
    }

}

module.exports = RelistHandler;