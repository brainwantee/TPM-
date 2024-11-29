const { config } = require('../config.js');
const { sleep, betterOnce, getWindowName, noColorCodes, normalTime, getSlotLore, sendDiscord, onlyNumbers, addCommasToNumber, normalNumber, isSkinned, formatNumber } = require('./Utils.js');
const { logmc, error, debug } = require('../logger.js');
let { useCookie, relist, percentOfTarget, listHours, doNotRelist, useItemImage, autoCookie } = config;
let { profitOver, skinned, tags, finders, stacks: stackedListing } = doNotRelist;
autoCookie = normalTime(autoCookie) / 1000;
profitOver = normalNumber(profitOver);
const axios = require('axios');

const coopRegexPlayers = /Co-op with (\d+) players:/;
const coopRegexSinglePlayer = /Co-op with (?:\[.*\]\s*)?([\w]+)/;

function calcDurationVisual(hours) {
    let itemDurationVisual = `${hours} Hour`;
    if (hours > 24) {
        if (hours > 336) {
            itemDurationVisual = `14 Days`;
        } else {
            itemDurationVisual = `${Math.floor(hours / 24).toString()} Day`
        }
    }
    return itemDurationVisual;
}

function calcListHours(price) {
    if (!Array.isArray(listHours)) return listHours;//Failsafe for people who haven't updated their config
    for (let i = 0; i < listHours.length; i += 3) {
        let lowerBound = normalNumber(listHours[i]);
        let upperBound = normalNumber(listHours[i + 1]);
        let percent = normalNumber(listHours[i + 2]);//why not use normal number!

        if (price >= lowerBound && price < upperBound) {
            return percent;
        }
    }
    logmc(`§6[§bTPM§6]§c Failed to find listing time for ${addCommasToNumber(price)}! Please change your config :(`)
    return listHours[3];
}

class RelistHandler {

    constructor(bot, state, tpm, updateSold, coflWs) {
        this.bot = bot;
        this.state = state;
        this.useRelist = relist;
        this.tpm = tpm;
        this.updateSold = updateSold;
        this.coflWs = coflWs;
        this.currentAuctions = 0;
        this.maxSlots = 14;
        this.hasCookie = true;
        this.cookieTime = null;
        this.ready = false;
        this.getReady();
    }

    declineSoldAuction() {//cba to add message listener twice so this will have to do
        this.currentAuctions--;
    }

    getReady() {
        if (!useCookie) {
            this.ready = true;
            return;
        }
        const { bot, state } = this;
        var check = async () => {
            try {
                await sleep(20_500);
                if (state.get() == 'getting ready') {
                    bot.getPurse();
                    debug('getting ready!')
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
                            error('wtf is your coop', JSON.stringify(profileLore));
                        }
                    }

                    debug(`max slots set to ${this.maxSlots}`)

                    bot.betterWindowClose();

                    await sleep(250);

                    bot.chat('/ah');
                    await betterOnce(bot, 'windowOpen');
                    await sleep(250);
                    debug(`Got AH, opening bids menu`);
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
                            this.updateSold();
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

                    debug(`Currently has ${this.currentAuctions} auctions`);

                    let webhookMessage = "";

                    let totalCollected = 0;

                    soldAuctions.forEach(auction => {
                        const lore = getSlotLore(auction);
                        const itemName = noColorCodes(auction.nbt.value.display.value.Name.value);
                        const soldLine = noColorCodes(lore.find(line => line.includes('Sold for:')));
                        const soldFor = onlyNumbers(soldLine);
                        totalCollected += soldFor;
                        debug(soldLine);
                        debug(soldFor);
                        webhookMessage += `Collected \`${addCommasToNumber(soldFor)} coins\` for selling \`${itemName}\`\n`;
                    })


                    await sleep(5000)//need a very long sleep because if a sold auction is claimed from the claim all then it closes the current GUI open
                    bot.chat('/sbmenu')//cookie. At this point they are forced to have a cookie because of the AH stuff so we can assume it

                    await betterOnce(bot, 'windowOpen');

                    const cookieLore = getSlotLore(bot.currentWindow.slots[51]);
                    let duration = cookieLore.find(line => line.includes('Duration'));
                    const cookieTime = normalTime(duration);
                    this.cookieTime = cookieTime;
                    debug(`Cookie time`, cookieTime);
                    bot.betterWindowClose();
                    await this.buyCookie(cookieTime / 1000);
                    const cookieEnd = Math.round((Date.now() + cookieTime) / 1000);

                    sendDiscord({
                        title: `${this.bot.username} is now ready!`,
                        color: 8771327,
                        fields: [
                            {
                                name: '',
                                value: `>>> **Auction Slots:** \`${this.currentAuctions}\`/\`${this.maxSlots}\`\n**Cofl Tier:** ${this.coflWs.getAccountTier()}\n**Cofl expires <t:${this.coflWs.getAccountEndingTime()}:R>**\n**Booster Cookie ends <t:${cookieEnd}:R>**\n**Connection ID:** \`${this.coflWs.getConnectionId()}\``,
                            }
                        ],
                        thumbnail: {
                            url: this.bot.head,
                        },
                        footer: {
                            text: `TPM Rewrite - Purse: ${addCommasToNumber(bot.getPurse(true) + totalCollected)}`,
                            icon_url: 'https://media.discordapp.net/attachments/1303439738283495546/1304912521609871413/3c8b469c8faa328a9118bddddc6164a3.png?ex=67311dfd&is=672fcc7d&hm=8a14479f3801591c5a26dce82dd081bd3a0e5c8f90ed7e43d9140006ff0cb6ab&=&format=webp&quality=lossless&width=888&height=888',
                        }
                    }, useItemImage ? this.bot.head : null, false, this.bot.username);

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
                                url: this.bot.head,
                            },
                            footer: {
                                text: `TPM Rewrite - Purse: ${addCommasToNumber(bot.getPurse(true) + totalCollected)}`,
                                icon_url: 'https://media.discordapp.net/attachments/1303439738283495546/1304912521609871413/3c8b469c8faa328a9118bddddc6164a3.png?ex=67311dfd&is=672fcc7d&hm=8a14479f3801591c5a26dce82dd081bd3a0e5c8f90ed7e43d9140006ff0cb6ab&=&format=webp&quality=lossless&width=888&height=888',
                            }
                        }, useItemImage ? this.bot.head : null, false, this.bot.username)
                    } else {
                        bot.betterWindowClose();
                    }

                    state.set(null);
                    setTimeout(() => {
                        this.ready = true;
                    }, 5000)
                    this.coflWs.sendScoreboard();

                } else {
                    debug('not getting ready!!!');
                }
            } catch (e) {
                error(`Error getting relist ready! Not going to use relist for ${bot.username}`, e);
                this.useRelist = false;
                bot.betterWindowClose();
                state.set(null);
                this.ready = true;
            }
        }

        bot.on('spawn', check);
    }

    async listAuction(auctionID, price, profit, weirdItemName, tag, listingTime = null, override = false) {
        if (!this.useRelist && !override) return;
        debug(`Listing ${auctionID} for ${price}`);
        if (!listingTime) listingTime = calcListHours(price);
        let currentVisual = calcDurationVisual(listingTime);
        try {
            const { state, bot } = this;
            state.set('listing');
            bot.chat(`/viewauction ${auctionID}`);
            await betterOnce(bot, 'windowOpen');
            let itemUuid = this.getItemUuid(bot.currentWindow.slots[13], true);
            let itemCount = bot.currentWindow.slots[13]?.count;
            if (!itemUuid) {
                debug(`Failed to get item uuid :( ${itemUuid} ${JSON.stringify(bot.currentWindow.slots[13])}`);
            }
            debug(`Item uuid: ${itemUuid}`);
            bot.betterClick(31);
            await sleep(500);
            bot.chat('/ah');
            await betterOnce(bot, 'windowOpen');
            await sleep(500);
            const uuids = [];//item not found debugging
            bot.currentWindow.slots.forEach(async slot => {
                let uuid = this.getItemUuid(slot);
                let count = slot?.count;
                uuids.push(`${uuid}:${uuid === itemUuid}`);
                if (uuid === itemUuid) {
                    debug(`Found item in ${slot.slot}`);
                    if (count !== itemCount) {
                        if (!stackedListing) throw new Error('It was a stacked item that was changed :(');
                        const pricePerItem = price / itemCount;
                        price = pricePerItem * count;//List for the correct price if multiple in inv
                        logmc(`§6[§bTPM§6]§c ${weirdItemName} had ${itemCount} in slot but combined with another item so there's now ${count}. Listing price is now ${price}`)
                    }
                    await sleep(2500);//issue with item not loading
                    bot.betterClick(slot.slot);
                }
            });
            await betterOnce(bot, 'windowOpen');
            debug(getWindowName(bot.currentWindow));
            if (getWindowName(bot.currentWindow) === 'Create Auction') {
                bot.betterClick(48);
                await sleep(250)
            } else if (getWindowName(bot.currentWindow).includes('Auction House')) {//includes allows for coop as well. This means item in slot most likely
                debug(uuids.join(' '));
                logmc(`§6[§bTPM§6] §cItem likely in slot already :(`);
                bot.betterClick(15);
                await betterOnce(bot, 'windowOpen');
                let createSlot = bot.currentWindow.slots.find(obj => obj?.nbt?.value?.display?.value?.Name?.value?.includes('Create Auction'));
                createSlot = createSlot.slot;
                debug(`Found create slot ${createSlot}`);
                if (!createSlot) {
                    throw new Error(`Failed to get create slot :(`);
                }
                bot.betterClick(createSlot);
                await betterOnce(bot, 'windowOpen');
                bot.betterClick(13);
                throw new Error(`Item in slot so can't list but I removed it!`);
            }

            let relistpercent = 100;
            if (!override) {
                relistpercent = this.calcPriceCut(price);
            }

            debug(relistpercent)

            const listPrice = Math.round(relistpercent * price / 100);
            if (listPrice < 500) {
                throw new Error(`Most likely incorrect listing price ${listPrice}`);
            }

            debug(listPrice);

            bot.betterClick(31);//set price
            await sleep(250);
            bot.editSign(`"${listPrice}"`);
            await betterOnce(bot, 'windowOpen');
            bot.betterClick(33);//set price
            await betterOnce(bot, 'windowOpen');
            bot.betterClick(16);//set price
            await sleep(350);
            bot.editSign(listingTime.toString());
            await betterOnce(bot, 'windowOpen');

            const priceSlot = bot.currentWindow.slots[31]?.nbt?.value?.display?.value?.Name?.value;
            const timeSlot = bot.currentWindow.slots[33]?.nbt?.value?.display?.value?.Name?.value;

            if (!priceSlot.includes(addCommasToNumber(listPrice)) || !timeSlot.includes(currentVisual)) {//acts as a window dectector too!
                throw new Error(`Incorrect pricing or time ${priceSlot} ${timeSlot} not having ${addCommasToNumber(listPrice)} or ${currentVisual}`);
            }

            bot.betterClick(29);
            await betterOnce(bot, 'windowOpen');
            bot.betterClick(11);
            await betterOnce(bot, 'windowOpen');
            bot.betterWindowClose();
            state.set(null);
            state.setAction();
            this.currentAuctions++;

            this.tpm.send(JSON.stringify({
                type: "listed",
                data: JSON.stringify({
                    auctionID,
                    purse: formatNumber(bot.getPurse()),
                    username: bot.username,
                    message: `Listed [\`${weirdItemName}\`](https://sky.coflnet.com/auction/${auctionID}) for \`${addCommasToNumber(listPrice)}\` (\`${formatNumber(profit)}\` profit) [Slots: ${this.currentAuctions}/${this.maxSlots}]`,
                    uuid: this.bot.uuid,
                    itemUuid: itemUuid,
                    itemTag: tag,
                    useItemImage: useItemImage
                })
            }), false)

        } catch (e) {
            if (getWindowName(this.bot.currentWindow)?.includes('Create')) this.bot.betterClick(13);//remove item from slot
            await sleep(250);
            error(`Error listing`, e);
            this.bot.betterWindowClose();
            this.state.set(null);
            this.state.setAction();
        }
    }

    getItemUuid(slot, message = false) {
        let uuid = slot?.nbt?.value?.ExtraAttributes?.value?.uuid?.value;
        if (!uuid) {
            if (message) logmc(`§6[§bTPM§6]§c Failed to get item uuid :( Resorting to item tag`);
            uuid = this.getName(slot?.nbt?.value?.ExtraAttributes?.value);
        }
        return uuid;
    }

    getName(ExtraAttributes) {
        if (!ExtraAttributes) return null;
        let id = ExtraAttributes.id.value;
        const split = id?.split('_');
        const first = split[0];
        if (first === 'RUNE' || first === "UNIQUE") {//Don't want to list incorrect rune
            id = `${Object.keys(ExtraAttributes.runes.value)[0]}_RUNE`;
        }
        return id;
    }

    checkRelist(profit, finder, itemName, tag, auctionID, price, weirdItemName, fromQueue = false) {
        if (!this.hasCookie) return false;
        if (!this.useRelist) {
            this.sendTPMSocket(auctionID, `relist is off`, itemName);
            return false;
        }
        let reasons = [];
        if (tags.includes(tag)) reasons.push(`${tag} is a blocked tag`);
        if (profit > profitOver) reasons.push(`profit is over ${profitOver}`);
        if (isSkinned(itemName) && skinned) reasons.push(`it's skinned`);
        if (finders.includes(finder)) reasons.push(`${finder} is a blocked finder`);
        if (profit <= 0) reasons.push('proft is under 0');

        if (reasons.length > 0) {
            logmc(`§6[§bTPM§6] §c${itemName}§c is not being listing because ${reasons.join(' and ')}!`);
            this.sendTPMSocket(auctionID, reasons.join(' and '), itemName);
            return false;
        }

        if (this.currentAuctions == this.maxSlots || this.state.get() || this.bot.currentWindow) {
            if (!fromQueue) this.state.queueAdd({ profit, finder, itemName, tag, auctionID, price, weirdItemName }, 'listing', 2);
            return false;
        }

        return true;
    }

    externalListCheck() {
        return this.currentAuctions !== this.maxSlots;
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
        debug(`Turning off relist`)
        this.useRelist = false;
        this.hasCookie = false;
    }

    getGottenReady() {//freaky ahh name
        return this.ready;
    }

    async delistAuction(itemUuid, auctionID, weirdItemName) {
        if (!useCookie) return;
        this.state.set('delisting');
        const { bot } = this;
        try {
            bot.chat('/ah');
            await betterOnce(bot, 'windowOpen');
            bot.betterClick(15);
            await betterOnce(bot, 'windowOpen');
            debug(itemUuid)
            bot.currentWindow.slots.forEach(slot => {
                const uuid = this.getItemUuid(slot);
                debug(uuid, uuid === itemUuid)
                if (uuid === itemUuid) {
                    bot.betterClick(slot.slot);
                }
            })

            await betterOnce(bot._client, 'open_window');//Faster cause if we use windowOpen then it won't find it sometimes (open_window is used to claim it so yea)

            sendDiscord({
                title: 'Delisted auction',
                color: 13320532,
                fields: [
                    {
                        name: '',
                        value: `Delisted [\`${weirdItemName}\`](https://sky.coflnet.com/a/${auctionID})`,
                    }
                ],
                thumbnail: {
                    url: this.bot.head,
                },
                footer: {
                    text: `TPM Rewrite`,
                    icon_url: 'https://media.discordapp.net/attachments/1303439738283495546/1304912521609871413/3c8b469c8faa328a9118bddddc6164a3.png?ex=67311dfd&is=672fcc7d&hm=8a14479f3801591c5a26dce82dd081bd3a0e5c8f90ed7e43d9140006ff0cb6ab&=&format=webp&quality=lossless&width=888&height=888',
                }
            }, useItemImage ? this.bot.head : null, false, this.bot.username);
            this.declineSoldAuction();

            await sleep(500);
            bot.betterWindowClose();//ensure window closes just in case it didn't delist
            this.state.set(null);
            this.state.setAction();
        } catch (e) {
            await sleep(250);
            error(`Error delisting`, e);
            bot.betterWindowClose();
            this.state.set(null);
            this.state.setAction();
        }
    }

    calcPriceCut(price) {
        for (let i = 0; i < percentOfTarget.length; i += 3) {
            let lowerBound = normalNumber(percentOfTarget[i]);
            let upperBound = normalNumber(percentOfTarget[i + 1]);
            let percent = normalNumber(percentOfTarget[i + 2]);

            if (price >= lowerBound && price < upperBound) {
                return percent;
            }
        }
    }

    async buyCookie(time = null) {
        return new Promise(async (resolve, reject) => {
            try {
                const { bot } = this;
                if (time && time > autoCookie) {
                    logmc(`§6[§bTPM§6]§3 Not buying a cookie because you have ${Math.round(time / 3600)}h`);
                    resolve(`Enough time`);
                } else {

                    const price = await this.getCookiePrice();

                    if (price > 20_000_000 || bot.getPurse() < price * 2) {
                        logmc(`§6[§bTPM§6]§c Cookie costs ${price} so not buying :(`);
                        resolve(`Cookie expensive :(`);
                    } else {
                        bot.chat(`/bz booster cookie`);
                        await betterOnce(bot, 'windowOpen');
                        bot.betterClick(11);
                        await betterOnce(bot, 'windowOpen');
                        await sleep(250);
                        bot.betterClick(10);
                        await betterOnce(bot, 'windowOpen');
                        await sleep(250);
                        bot.betterClick(10);//This click buys the cookie
                        try {//check for full inv
                            await betterOnce(bot, "message", (message, type) => {
                                let text = message.getText(null);
                                debug("cookie text", text);
                                return text == `One or more items didn't fit in your inventory and were added to your item stash! Click here to pick them up!`
                            })
                            logmc(`§6[§bTPM§6]§c Your inv is full so I can't eat this cookie. You have one in your stash now`);
                            resolve(`Full inv :(`);
                            bot.betterWindowClose();
                        } catch (e) {//if no message for full inv then yay we don't have one
                            debug(`cookie error (probably not an actual error)`, e);
                            bot.betterWindowClose();
                            let cookieSlot = (bot.inventory.slots.find(slot => slot?.name === 'cookie'))?.slot;
                            debug(`Got cookie slot ${cookieSlot}`);
                            if (!cookieSlot) {
                                resolve(`no cookie found`);
                                debug(JSON.stringify(bot.inventory.slots));
                            } else {
                                if (cookieSlot < 36) {//not in hotbar. It would auto go to hotbar so that mean it's full
                                    bot.clickWindow(cookieSlot, 0, 2);//can't use betterclick because it has failsafe for no window open and we don't want one open!
                                    await sleep(500);
                                    cookieSlot = (bot.inventory.slots.find(slot => slot?.name === 'cookie'))?.slot;
                                    debug(`Moved it maybe?`, cookieSlot);
                                }
                            }
                            await sleep(500);
                            bot.setQuickBarSlot(cookieSlot - 36);
                            await sleep(100);
                            bot.activateItem();
                            await betterOnce(bot, 'windowOpen')
                            bot.betterClick(11)
                            debug("activated cookie");
                            bot.betterWindowClose();//just to be safe
                            logmc(`§6[§bTPM§6]§3 Automaticlly ate a booster cookie cause you had ${Math.round(time / 3600)} hours left. Now you have ${Math.round((time + 4 * 86400) / 3600)} hours`);
                            this.cookieTime += 4 * 8.64e+7;
                            resolve();
                        }

                    }

                }
            } catch (e) {
                error(`Error buying cookie: `, e);
                this.bot.betterWindowClose();
                //no need to change state because it'll safely go back to getting ready
                resolve(`Failed to buy cookie`);
            }

        });
    }

    async getCookiePrice() {
        try { return Math.round((await axios.get('https://api.hypixel.net/v2/skyblock/bazaar')).data.products.BOOSTER_COOKIE.quick_status.buyPrice) } catch (e) { error(e) };
    }


}

module.exports = RelistHandler;