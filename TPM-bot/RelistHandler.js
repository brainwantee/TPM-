const { config } = require('../config.js');
const { sleep, betterOnce, getWindowName } = require('./Utils.js');
const { useCookie, relist } = config;

class RelistHandler {

    constructor(bot, state) {
        this.bot = bot;
        this.state = state;
        this.useRelist = relist;
        this.currentAuctions = null;
        this.maxSlots = null;
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
                    console.log(profileLore);
                    profileLore.forEach(line => {
                        
                    });

                } else {
                    console.log('not getting ready!!!')
                }
            }
        } catch(e) {
            console.error(`Error getting relist ready! Not going to use relist for ${bot.ign}`, e);
            this.useRelist = false;
        }

        bot.on('spawn', check);
    }

}

module.exports = RelistHandler;