const { config } = require('../config.js');
const { sleep, betterOnce, getWindowName, noColorCodes, getSlotLore, sendDiscord, onlyNumbers, addCommasToNumber } = require('./Utils.js');
const { useCookie, relist } = config;

const coopRegexPlayers = /Co-op with (\d+) players:/;
const coopRegexSinglePlayer = /Co-op with (?:\[.*\]\s*)?([\w]+)/;

class RelistHandler {

    constructor(bot, state) {
        this.bot = bot;
        this.state = state;
        this.useRelist = relist;
        this.currentAuctions = 0;
        this.maxSlots = 14;
        this.getReady();
    }

    declineSoldAuction() {//cba to add message listener twice so this will have to do
        this.currentAuctions--;
    }

    getReady() {
        if (!useCookie) return;
        const { bot, state } = this;
        try {
            var check = async () => {
                await sleep(20_500);
                if (state.get() == 'getting ready') {
                    console.log('getting ready!')
                    bot.off('spawn', check);
                    bot.chat('/profiles');
                    await betterOnce(bot, "windowOpen");
                    const profileLore = getSlotLore(bot.currentWindow?.slots?.find(block => block?.name === 'emerald_block'));
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

                    bot.betterWindowClose();

                    await sleep(250);

                    bot.chat('/ah');
                    await betterOnce(bot, 'windowOpen');
                    bot.betterClick(15);
                    await betterOnce(bot, 'windowOpen');
                    let claimAll = null;
                    let soldAuctions = [];//if there's no cauldron we click this
                    bot.currentWindow.slots.forEach(slot => {
                        const lore = getSlotLore(slot);
                        if (!lore) return;
                        const hasBuyer = lore.find(line => line.includes('Buyer:'));
                        if (hasBuyer) {
                            soldAuctions.push(slot);
                            return;
                        }
                        const hasSeller = lore.find(line => line.includes('Seller:'));
                        if (hasSeller) {
                            this.currentAuctions++;
                            return;
                        }
                        if (slot?.name === 'cauldron') claimAll = slot.slot;
                    });

                    if (claimAll) {
                        bot.betterClick(claimAll);
                    } else if (soldAuctions.length == 1) {
                        bot.betterClick(soldAuctions[0].slot);
                    }

                    console.log(`Currently has ${this.currentAuctions} auctions`);

                    let webhookMessage = "";

                    soldAuctions.forEach(auction => {
                        const lore = getSlotLore(auction);
                        const itemName = noColorCodes(auction.nbt.value.display.value.Name.value);
                        const soldLine = noColorCodes(lore.find(line => line.includes('Sold for:')));
                        const soldFor = onlyNumbers(soldLine);
                        console.log(soldLine);
                        console.log(soldFor);
                        webhookMessage += `Collected \`${addCommasToNumber(soldFor)} coins\` for selling \`${itemName}\`\n`;
                    })

                    if (webhookMessage) {
                        sendDiscord({
                            title: 'Claimed sold items!',
                            color: 16731310,
                            fields: [
                                {
                                    name: '',
                                    value: webhookMessage,
                                }
                            ],
                            thumbnail: {
                                url: `https://mc-heads.net/head/${bot.uuid}.png`,
                            },
                            footer: {
                                text: `TPM Rewrite`,
                                icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
                            }
                        })
                    } else {
                        bot.betterWindowClose();
                        state.set(null);
                    }

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

    async listAuction(auctionID, price) {
        try {
            const { state, bot } = this;
            state.set('listing');
            bot.chat(`/viewauction ${auctionID}`);
            await betterOnce(bot, 'windowOpen');
            let itemUuid = bot.currentWindow.slots[31].nbt.value
            console.log(itemUuid);
        } catch(e) {
            console.error(`Error listing`, e);
        }
    }

}

module.exports = RelistHandler;