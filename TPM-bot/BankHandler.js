const { betterOnce, getWindowName, sendDiscord, formatNumber, addCommasToNumber } = require('./Utils.js');
const { error, debug } = require('../logger.js');
const { config } = require('../config.js');
const { useItemImage } = config;

class BankHandler {

    constructor(bot, state) {
        this.bot = bot;
        this.state = state;
    }

    //Guys if anyone has a better name for this lmk
    async coins(withdraw, personal, amount) {
        const { bot, state } = this;
        try {
            state.set('bank');
            debug(`Doing coins stuff withdraw: ${withdraw}, personal: ${personal}, amount ${amount}`);
            const oldPurse = bot.getPurse();
            bot.chat('/bank');
            await betterOnce(bot, 'windowOpen');
            if (getWindowName(bot.currentWindow) == "Bank") {
                debug(`Got coop thing`);
                bot.betterClick(personal ? 15 : 11);
                await betterOnce(bot, 'windowOpen');
            }
            bot.betterClick(withdraw ? 13 : 11);
            await betterOnce(bot, 'windowOpen');
            bot.betterClick(withdraw ? 16 : 15);
            await bot.waitForTicks(5);
            bot.editSign(`"${amount.toString()}"`);
            const newPurse = withdraw ? oldPurse + amount : oldPurse - amount;
            sendDiscord({
                title: 'Coins',
                color: 8388564,
                fields: [
                    {
                        name: '',
                        value: `${withdraw ? "Withdrew" : "Put away"} \`${addCommasToNumber(amount)}\` coins!`,
                    }
                ],
                thumbnail: {
                    url: bot.head,
                },
                footer: {
                    text: `TPM Rewrite - Purse ${formatNumber(newPurse)}`,
                    icon_url: 'https://media.discordapp.net/attachments/1303439738283495546/1304912521609871413/3c8b469c8faa328a9118bddddc6164a3.png?ex=67311dfd&is=672fcc7d&hm=8a14479f3801591c5a26dce82dd081bd3a0e5c8f90ed7e43d9140006ff0cb6ab&=&format=webp&quality=lossless&width=888&height=888',
                }
            }, useItemImage ? bot.head : null, false, bot.username)
            await bot.waitForTicks(3);
        } catch (e) {
            error(`Error in bank stuff ${e}`);
        }
        bot.betterWindowClose();
        state.setAction();
        state.set(null);
    }

}

module.exports = BankHandler;