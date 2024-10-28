const { logmc, debug, error, startTracker } = require('./logger.js');
const { sleep, getLatestLog, normalNumber, sendDiscord } = require('./TPM-bot/Utils.js');
const { config } = require('./config.js');
const { igns, webhook, discordID } = config;

const WebSocket = require('ws');

class TpmSocket {

    constructor(bots, destroyBot, startBot) {
        this.ws = null;
        this.bots = bots;
        this.destroyBot = destroyBot;
        this.startBot = startBot;
        this.sentFailureMessage = false;
        this.storedMessages = [];//if socket is down, send all of these at once
        this.settings = [];
        this.makeWebsocket();
    }

    makeWebsocket() {
        try {
            debug(`Making new TPM socket`);
            this.ws = new WebSocket('ws://107.152.38.30:1241');//random VPS

            this.ws.on('open', async () => {
                this.sentFailureMessage = false;
                logmc('§6[§bTPM§6] §3Connected to the TPM websocket!');
                await this.botsReady();
                if (this.settings.length === 0) await this.getSettings();
                if (this.storedMessages.length > 0) {
                    this.send(JSON.stringify({
                        type: "batch",
                        data: JSON.stringify(this.storedMessages)
                    }))
                }
                this.send(JSON.stringify({
                    type: "loggedIn",
                    data: JSON.stringify({
                        discordID: discordID,
                        webhook: webhook,
                        igns: igns,
                        settings: this.settings
                    })
                }), false)
            })

            this.ws.on('error', async (e) => {
                debug(`TPM Socket error 1`);
                if (e.code === 'ECONNREFUSED') {
                    if (!this.sentFailureMessage) {
                        logmc('§6[§bTPM§6] §cTPM websocket down. Please report to a dev!');
                        this.sentFailureMessage = true;
                    }
                } else {
                    error('WS error1:', e);
                }
            });

            this.ws.on('close', async (e) => {
                debug(`TPM Socket closed`);
                if (!this.sentFailureMessage) {
                    logmc('§6[§bTPM§6] §cTPM websocket down. Please report to a dev!');
                    this.sentFailureMessage = true;
                }
                await sleep(5000);
                this.makeWebsocket();
            });

            this.ws.on('message', this.handleMessage.bind(this));

        } catch (e) {
            error(`WS error2:`, e);
        }
    }

    send(message, batch = true) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            debug(`Sending ${message}`);
            this.ws.send(message);
        } else if (batch) {
            this.storedMessages.push(message);
            debug(`Not currently connected`)
        }
    }

    async handleMessage(message) {
        const msg = JSON.parse(message);
        const data = JSON.parse(msg.data);//This isn't safe and if it's not JSON format then it'll crash but that's intentional!
        debug(message.toString());
        switch (msg.type) {
            case "list": {
                const bot = this.bots[data.username];
                data.price = normalNumber(data.price);
                debug(JSON.stringify(data));
                if (!bot) {
                    debug(`Didn't find a bot for ${data.username}`);
                    return;
                }
                bot.state.queueAdd(data, 'listingNoName', 2);
                break;
            }
            case "log":
                const log = getLatestLog();
                break;
            case "allStats":
                for (const ign in this.bots) {
                    const bot = this.bots[ign];
                    bot.handleTerminal('/stats');
                }
                break;
            case "stats":
                for (const ign in this.bots) {
                    const bot = this.bots[ign];
                    bot.handleTerminal('/ping');
                }
                break;
            case "delist": {
                const bot = this.bots[data.username];
                debug(JSON.stringify(data));
                if (!bot) {
                    debug(`Didn't find a bot for ${data.username}`);
                    return;
                }
                bot.state.queueAdd(data, 'delisting', 3);
                break;
            }
            case "startBot": {
                debug(`Starting ${data.username}`)
                this.startBot(data.username, this, true);
                break;
            }
            case "killBot": {
                debug(`Killing ${data.username}`)
                this.destroyBot(data.username);
                break;
            }
            case "buyFlip": {
                let username = data.username;
                if (!username) {
                    username =  Object.keys(this.bots)[0];
                }
                const bot = this.bots[username];
                debug(JSON.stringify(data));
                if (!bot) {
                    debug(`Didn't find a bot for ${username}`);
                    return;
                }
                bot.state.queueAdd({ finder: "EXTERNAL", profit: 0, itemName: data.auctionId, auctionID: data.auctionId }, 'buying', 4);
                break;
            }
            case "sendTerminal": {
                let username = data.username;
                if (!username) {
                    username =  Object.keys(this.bots)[0];
                }
                const bot = this.bots[username];
                debug(JSON.stringify(data));
                if (!bot) {
                    debug(`Didn't find a bot for ${username}`);
                    return;
                }
                const split = data.command.split(' ');
                const command = split.shift();
                bot.handleTerminal(command, split.join(' '));
                console.log(data.command);
                const messages = await startTracker();
                sendDiscord({
                    title: 'Command!',
                    color: 13313596,
                    fields: [
                        {
                            name: '',
                            value: `\`\`Messages for the past 10 seconds:\`\`\n${messages.join('\n')}`,
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
                break;
            }
        }
    }

    async getSettings() {
        const settingsPromises = Object.keys(this.bots).map((botKey) => {
            return new Promise((resolve) => {
                const ws = this.bots[botKey].ws;
                const coflSocket = this.bots[botKey].coflSocket;
                coflSocket.handleCommand(`/cofl get json`);
                ws.once('jsonSettings', (msg) => {
                    this.settings.push(msg);
                    resolve();
                });
            });
        });

        await Promise.all(settingsPromises);
    }

    async botsReady() {
        return new Promise(async (resolve) => {
            while (Object.keys(this.bots).length !== igns.length) {
                await sleep(10_000);
            }
            resolve();
        });
    }
}

module.exports = TpmSocket;