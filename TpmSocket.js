const { logmc, debug, error } = require('./logger.js');
const { sleep, getLatestLog, normalNumber } = require('./TPM-bot/Utils.js');
const { config } = require('./config.js');
const { igns, webhook, discordID } = config;

const WebSocket = require('ws');

class TpmSocket {

    constructor(bots) {
        this.ws = null;
        this.bots = bots;
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
                sleep(5000);
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

    handleMessage(message) {
        const msg = JSON.parse(message);
        const data = JSON.parse(msg.data);//This isn't safe and if it's not JSON format then it'll crash but that's intentional!
        debug(message.toString());
        switch (msg.type) {
            case "list":
                const bot = this.bots[data.username];
                data.price = normalNumber(data.price);
                console.log(JSON.stringify(data));
                if (!bot) {
                    debug(`Didn't find a bot for ${data.username}`);
                    return;
                }
                bot.state.queueAdd(data, 'listingNoName', 2);
                break;
            case "log":
                const log = getLatestLog();
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
            console.log(`Resolving because ${Object.keys(this.bots).length} and ${igns.length}`)
            resolve();
        });
    }
}

module.exports = TpmSocket;