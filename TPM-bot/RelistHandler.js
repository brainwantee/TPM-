const { config } = require('../config.js');
const { sleep, betterOnce, getWindowName, noColorCodes, getSlotLore, sendDiscord, onlyNumbers, addCommasToNumber, normalNumber, isSkinned, formatNumber } = require('./Utils.js');
const { logmc } = require('../logger.js');
const { useCookie, relist, percentOfTarget, listHours, doNotRelist } = config;
let { profitOver, skinned, tags, finders } = doNotRelist;
profitOver = normalNumber(profitOver);

const coopRegexPlayers = /Co-op with (\d+) players:/;
const coopRegexSinglePlayer = /Co-op with (?:\[.*\]\s*)?([\w]+)/;

let itemDurationVisual = `${listHours.toString()} Hour`;
if (listHours >= 24) {
    if (listHours > 336) {
        itemDurationVisual = `14 Days`;
    } else {
        itemDurationVisual = `${Math.floor(listHours / 24)} Day`
    }
}

class RelistHandler {

    constructor(bot, state, tpm) {
        this.bot = bot;
        this.state = state;
        this.useRelist = relist;
        this.tpm = tpm;
        this.currentAuctions = 0;
        this.maxSlots = 14;
        this.hasCookie = true;
        this.getReady();
    }

    declineSoldAuction() {//cba to add message listener twice so this will have to do
        this.currentAuctions--;
    }

    getReady() {
        if (!useCookie) return;
        const { bot, state } = this;
        var check = async () => {
            try {
                await sleep(20_500);
                if (state.get() == 'getting ready') {
                    bot.getPurse();
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

                    let totalCollected = 0;

                    soldAuctions.forEach(auction => {
                        const lore = getSlotLore(auction);
                        const itemName = noColorCodes(auction.nbt.value.display.value.Name.value);
                        const soldLine = noColorCodes(lore.find(line => line.includes('Sold for:')));
                        const soldFor = onlyNumbers(soldLine);
                        totalCollected += soldFor;
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
                                    value: `${webhookMessage}${soldAuctions.length == 1 ? '' : `\nCollected \`${addCommasToNumber(totalCollected)}\` coins in total!`}`,
                                }
                            ],
                            thumbnail: {
                                url: `https://mc-heads.net/head/${bot.uuid}.png`,
                            },
                            footer: {
                                text: `TPM Rewrite - Purse: ${addCommasToNumber(bot.getPurse(true) + totalCollected)}`,
                                icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
                            }
                        })
                    } else {
                        bot.betterWindowClose();
                    }

                    state.set(null);

                } else {
                    console.log('not getting ready!!!');
                }
            } catch (e) {
                console.error(`Error getting relist ready! Not going to use relist for ${bot.ign}`, e);
                this.useRelist = false;
                bot.betterWindowClose();
                state.set(null);
            }
        }

        bot.on('spawn', check);
    }

    async listAuction(auctionID, price, profit, weirdItemName) {
        if (!this.useRelist) return;
        console.log(`Listing ${auctionID} for ${price}`);
        try {
            const { state, bot } = this;
            state.set('listing');
            bot.chat(`/viewauction ${auctionID}`);
            await betterOnce(bot, 'windowOpen');
            let itemUuid = this.getItemUuid(bot.currentWindow.slots[13]);
            if (!itemUuid) {
                throw new Error(`Failed to get item uuid :( ${itemUuid}`);
            }
            bot.betterClick(31);
            await sleep(250);
            bot.chat('/ah');
            await betterOnce(bot, 'windowOpen');
            bot.currentWindow.slots.forEach(slot => {
                if (this.getItemUuid(slot) === itemUuid) {
                    console.log(`Found item in ${slot.slot}`);
                    bot.betterClick(slot.slot);
                }
            });
            await betterOnce(bot, 'windowOpen');
            console.log(getWindowName(bot.currentWindow));
            if (getWindowName(bot.currentWindow) === 'Create Auction') {
                betterClick(48);
                await sleep(250)
            } else if (getWindowName(bot.currentWindow).includes('Auction House')) {//includes allows for coop as well. This means item in slot most likely
                logmc(`Item likely in slot already.`);
                bot.betterClick(15);
                await betterOnce(bot, 'windowOpen');
                let createSlot = bot.currentWindow.slots.find(obj => obj?.nbt?.value?.display?.value?.Name?.value?.includes('Create Auction'));
                createSlot = createSlot.slot;
                console.log(`Found create slot ${createSlot}`);
                if (!createSlot) {
                    throw new Error(`Failed to get create slot :(`);
                }
                bot.betterClick(createSlot);
                await betterOnce(bot, 'windowOpen');
                bot.betterClick(13);
                throw new Error(`Item in slot so can't list but I removed it!`);
            }

            let relistpercent = 100;
            for (let i = 0; i < percentOfTarget.length; i += 3) {
                let lowerBound = percentOfTarget[i];
                let upperBound = percentOfTarget[i + 1];
                let percent = percentOfTarget[i + 2];

                if (price >= lowerBound && price < upperBound) {
                    relistpercent = percent;
                    break;
                }
            }

            console.log(relistpercent)

            const listPrice = Math.round(relistpercent * price / 100);
            if (listPrice < 500) {
                bot.betterClick(13);//remove item from slot
                throw new Error(`Most likely incorrect listing price ${listPrice}`);
            }

            console.log(listPrice);

            bot.betterClick(31);//set price
            await sleep(250);
            bot.editSign(`"${listPrice}"`);
            await betterOnce(bot, 'windowOpen');
            bot.betterClick(33);//set price
            await betterOnce(bot, 'windowOpen');
            bot.betterClick(16);//set price
            await sleep(350);
            bot.editSign(listHours.toString());
            await betterOnce(bot, 'windowOpen');

            const priceSlot = bot.currentWindow.slots[31]?.nbt?.value?.display?.value?.Name?.value;
            const timeSlot = bot.currentWindow.slots[33]?.nbt?.value?.display?.value?.Name?.value;

            if (!priceSlot.includes(addCommasToNumber(listPrice)) || !timeSlot.includes(itemDurationVisual)) {//acts as a window dectector too!
                bot.betterClick(13);
                throw new Error(`Incorrect pricing or time ${priceSlot} ${timeSlot} not having ${addCommasToNumber(listPrice)} or ${itemDurationVisual}`);
            }

            bot.betterClick(29);
            await betterOnce(bot, 'windowOpen');
            bot.betterClick(11);
            await betterOnce(bot, 'windowOpen');
            bot.betterWindowClose();
            state.set(null);
            state.setAction();
            this.currentAuctions++;

            sendDiscord({
                title: 'Item Listed!',
                color: 13677311,
                fields: [
                    {
                        name: '',
                        value: `Listed [\`${weirdItemName}\`](https://www.sky.coflnet.com/auction/${auctionID}) for \`${addCommasToNumber(price)}\` (\`${formatNumber(profit)}\` profit) [Slots: ${this.currentAuctions}/${this.maxSlots}]`,
                    }
                ],
                thumbnail: {
                    url: `https://mc-heads.net/head/${bot.uuid}.png`,
                },
                footer: {
                    text: `TPM Rewrite - Purse: ${formatNumber(bot.getPurse())}`,
                    icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
                }
            })

        } catch (e) {
            await sleep(250);
            console.error(`Error listing`, e);
            this.bot.betterWindowClose();
            this.state.set(null);
            this.state.setAction();
        }
    }

    getItemUuid(slot) {
        return slot?.nbt?.value?.ExtraAttributes?.value?.uuid?.value;
    }

    checkRelist(profit, finder, itemName, tag, auctionID, price) {
        if(!this.hasCookie) return;
        if (!this.useRelist) {
            this.sendTPMSocket(auctionID, `relist is off`, itemName);
            return false;
        }
        let reasons = [];
        if (tags.includes(tag)) reasons.push(`${tag} is a blocked tag`);
        if (profit > profitOver) reasons.push(`profit is over ${profitOver}`);
        if (isSkinned(itemName) && skinned) reasons.push(`it's skinned`);
        if (finders.includes(finder)) reasons.push(`${finder} is a blocked finder`);

        if (reasons.length > 0) {
            logmc(`§6[§bTPM§6] §c${itemName}§c is not being listing because ${reasons.join(' and ')}!`);
            this.sendTPMSocket(auctionID, reasons.join(' and '), itemName);
            return false;
        }

        if (this.currentAuctions == this.maxSlots || this.state.get() || this.bot.currentWindow) {
            this.state.queueAdd({ profit, finder, itemName, tag, auctionID, price }, 'listing', 2);//currently useless :(
            return false;
        }

        return true;
    }

    sendTPMSocket(auctionID, reasons, itemName) {
        this.tpm.send(JSON.stringify({
            type: "failedList",
            data: JSON.stringify({
                auctionID: auctionID,
                reasons: reasons,
                itemName: itemName,
                username: this.bot.username,
                uuid: this.bot.uuid
            })
        }), false)
    }

    turnOffRelist() {//For when cookie runs out mid session
        this.useRelist = false;
        this.hasCookie = false;
    }

}

module.exports = RelistHandler;