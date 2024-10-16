const { logmc, customIGNColor } = require("../logger.js");
const { sendDiscord, stripItemName, nicerFinders, formatNumber, addCommasToNumber, onlyNumbers } = require('./Utils.js');
const { config } = require('../config.js');
const { igns, webhookFormat, blockUselessMessages } = config;

const axios = require('axios');

const soldRegex = /^\[Auction\] (.+?) bought (.+?) for ([\d,]+) coins CLICK$/;
const boughtRegex = /^You purchased (.+?) for ([\d,]+) coins!$/;

const uselessMessages = ['items stashed away!', 'CLICK HERE to pick them up!'];

class MessageHandler {

    constructor(ign, bot, socket, state, relist, island) {
        this.ign = ign;
        this.bot = bot;
        this.coflSocket = socket;
        this.island = island;
        this.ws = socket.getWs();
        this.state = state;
        this.relist = relist;
        this.webhookObject = {};//"itemName:pricePaid"
        this.relistObject = {};//auctionID. Using a different object ensures that it never lists for the wrong price
        this.soldObject = {};//"itemName:target"
        this.ignPrefix = igns.length == 1 ? "" : `${customIGNColor(ign)}${ign}: `;
        this.firstGui = null;
        this.sentCookie = false;
        this.privacySettings = /no regex yet but I don't want it to crash so I'm putting regex/;
        this.messageListener();
        this.coflHandler();
    }

    messageListener() {

        let buyspeed = null;
        let oldBuyspeed = null;

        this.bot.on('message', async (message, type) => {
            if (type !== 'chat') return;
            let sentMessage = false;
            let text = message.getText(null);
            if (text.trim() === '') sentMessage = true;
            this.sendChatBatch(text);
            switch (text) {
                case 'Putting coins in escrow...':
                    buyspeed = Date.now() - this.firstGui
                    if (buyspeed == oldBuyspeed) return;
                    oldBuyspeed = buyspeed;
                    logmc(`§6[§bTPM§6] §3Auction bought in ${buyspeed}ms`);
                    this.bot.betterWindowClose();
                    this.state.setAction();
                    break;
                case "This auction wasn't found!":
                    if (this.state.get() === 'buying') this.state.set(null);
                    this.state.setAction();
                    break;
                case "You cannot view this auction!":
                case "You need the Cookie Buff to use this command!":
                    if(this.sentCookie) return;
                    sendDiscord({
                        title: 'Cookie Gone!!!',
                        color: 13313596,
                        fields: [
                            {
                                name: '',
                                value: `${this.ign} doesn't have a cookie :( Automatically turning off relist and moving to hub`,
                            }
                        ],
                        thumbnail: {
                            url: `https://mc-heads.net/head/${this.bot.uuid}.png`,
                        },
                        footer: {
                            text: `TPM Rewrite - Purse ${formatNumber(this.bot.getPurse())}`,
                            icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
                        }
                    }, true)
                    this.sentCookie = true;
                    this.relist.turnOffRelist();
                    this.island.setIsland(false, 'Hub', false);
                    logmc(`§6[§bTPM§6] §cCookie gone!!!`);
                case "The auctioneer has closed this auction!":
                case "You don't have enough coins to afford this bid!":
                    this.state.set(null);
                    this.bot.betterWindowClose();
                    this.state.setAction();
                    break;
            }

            const boughtMatch = text.match(boughtRegex);
            if (boughtMatch) {
                const item = boughtMatch[1];
                const price = boughtMatch[2];
                const priceNoCommas = price.replace(/,/g, '');
                const weirdBought = stripItemName(item);
                const objectIntance = this.webhookObject[`${weirdBought}:${priceNoCommas}`];
                console.log(objectIntance);
                console.log(`${weirdBought}:${priceNoCommas}`);
                if (objectIntance) {
                    let { profit, auctionID, target, bed, finder } = objectIntance;
                    finder = nicerFinders(finder);
                    target = formatNumber(target);
                    profit = formatNumber(profit);
                    sendDiscord({
                        title: 'Item purchased',
                        color: 2615974,
                        fields: [
                            {
                                name: '',
                                value: this.formatString(webhookFormat, item, profit, price, target, buyspeed, bed, finder, auctionID),
                            }
                        ],
                        thumbnail: {
                            url: `https://mc-heads.net/head/${this.bot.uuid}.png`,
                        },
                        footer: {
                            text: `TPM Rewrite - Found by ${finder} - Purse ${formatNumber(this.bot.getPurse(true) - parseInt(priceNoCommas, 10))}`,
                            icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
                        }
                    })

                    this.state.setAction();

                    setTimeout(() => this.bot.getPurse(), 5000);

                    const relistObject = this.relistObject[auctionID];

                    const { profit: relistProfit, target: relistTarget, itemName, weirdItemName, finder: relistFinder, tag } = relistObject;

                    console.log(relistObject);
                    setTimeout(() => {
                        if (this.relist.checkRelist(relistProfit, relistFinder, itemName, tag, auctionID, relistTarget)) {
                            this.relist.listAuction(auctionID, relistTarget, relistProfit, weirdItemName);
                        }
                    }, 10000)//delay to allow for other flips to get bought

                }
                this.sendScoreboard();
            }

            const soldMatch = text.match(soldRegex);
            if (soldMatch) {
                if (!this.relist.getGottenReady()) return;
                this.sendScoreboard();
                const buyer = soldMatch[1];
                const item = soldMatch[2];
                const price = onlyNumbers(soldMatch[3]);
                const object = this.soldObject[`${stripItemName(item)}:${price}`];
                let profitMessage = '';
                if (object) {
                    profitMessage = ` (\`${object.profit}\` profit)`
                }
                const clickEvent = message?.clickEvent?.value;
                const auctionID = clickEvent.replace('/viewauction ', '').replace(/-/g, '');
                this.state.setAction();
                sendDiscord({
                    title: 'Item Sold',
                    color: 16731310,
                    fields: [
                        {
                            name: '',
                            value: `Collected \`${addCommasToNumber(price)} coins\` for selling [\`${item}\`](https://sky.coflnet.com/auction/${auctionID}) to \`${buyer}\`${profitMessage}`,
                        }
                    ],
                    thumbnail: {
                        url: `https://mc-heads.net/head/${this.bot.uuid}.png`,
                    },
                    footer: {
                        text: `TPM Rewrite - Purse ${formatNumber(this.bot.getPurse(true) + price)}`,
                        icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
                    }
                })

                setTimeout(() => {
                    this.state.queueAdd(clickEvent, 'claiming', 1);
                }, 1500)

                setTimeout(() => this.bot.getPurse, 5000);

            }

            if (blockUselessMessages) {
                for (const message of uselessMessages) {
                    if (text.includes(message)) {
                        sentMessage = true;
                        break;
                    }
                }
            }

            if (!sentMessage) logmc(`${this.ignPrefix}${message.toAnsi()}`);
        })

    }

    coflHandler() {
        this.ws.on('getInventory', this.sendInventory);
        this.ws.on('open', this.sendScoreboard);
        const settings = msg => {
            this.privacySettings = new RegExp(msg.chatRegex);
            this.ws.off('settings', settings);
        };
        this.ws.on('settings', settings);
    }

    sendInventory = () => {
        this.coflSocket.send(JSON.stringify({
            type: 'uploadInventory',
            data: JSON.stringify(this.bot.inventory)
        }), false);
    };

    sendChatBatch(message) {
        if (this.privacySettings.test(message)) {
            this.coflSocket.send(
                JSON.stringify({
                    type: 'chatBatch',
                    data: JSON.stringify([message]),
                }), false
            );
        }
    }

    setBuySpeed(BINView) {//for autobuy
        this.firstGui = BINView;
    }

    sendScoreboard() {
        setTimeout(() => {
            if (!this.bot?.scoreboard?.sidebar?.items) return;
            let scoreboard = this.bot.scoreboard.sidebar.items.map(item => item.displayName.getText(null).replace(item.name, ''));
            if (scoreboard.find(e => e.includes('Purse:') || e.includes('Piggy:'))) {
                this.coflSocket.send(
                    JSON.stringify({
                        type: 'uploadScoreboard',
                        data: JSON.stringify(scoreboard)
                    }), true
                );
            }
        }, 5500);
    }

    objectAdd(weirdItemName, price, target, profit, auctionID, bed, finder, itemName, tag) {
        this.soldObject[`${weirdItemName}:${target}`] = {
            profit: profit
        };
        this.webhookObject[`${weirdItemName}:${price}`] = {
            auctionID: auctionID,
            target: target,
            profit: profit,
            bed: bed,
            finder: finder
        };
        this.relistObject[auctionID] = {
            target: target,
            profit: profit,
            itemName: itemName,
            finder: finder,
            tag: tag,
            weirdItemName: weirdItemName,
            pricePaid: price
        }
        //console.log(this.webhookObject);
    }

    formatString(format, ...args) {
        return args.reduce((formatted, arg, index) => {
            const regex = new RegExp(`\\{${index}\\}`, 'g')
            return formatted.replace(regex, arg);
        }, format)
    }

    getObjects() {
        return { relist: this.relistObject, webhook: this.webhookObject, sold: this.soldObject };
    }

}

module.exports = MessageHandler;