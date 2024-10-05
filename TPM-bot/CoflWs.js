const axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');

const { config, updateConfig } = require('../config.js');
const { logmc, customIGNColor } = require('../logger.js');
const { DISCORD_PING, formatNumber, noColorCodes, sleep, sendDiscord } = require('./Utils.js');
const { getPackets } = require('./packets.js');

const { usInstance, blockUselessMessages } = config;

const connectionRegex = /\[Coflnet\]:  Your connection id is ([a-f0-9]{32}), copy that if you encounter an error/;

class CoflWs {

    constructor(ign, bot) {
        this.ws = new EventEmitter();
        this.websocket = null;
        this.link = null;
        this.ign = ign;
        this.bot = bot;

        this.startWs();
    }

    startWs(link = null) {

        if (link === null) {
            link = `${usInstance ? 'ws://sky-us.' : 'wss://sky.'}coflnet.com/modsocket?version=1.5.1-af&player=${this.ign}&SId=${config.session}`;
            this.link = link;
        }//There's no option to use regular socket because it's slower

        this.websocket = new WebSocket(link);
        const { websocket, ws } = this;//screw "this" 

        websocket.on('open', (message) => {
            console.log(`Started cofl connection!`);
            sendDiscord({
                title: 'Started flipping',
                color: 16629250,
                fields: [
                    {
                        name: '',
                        value: `Logged in as \`\`${this.ign}\`\``,
                    }
                ],
                thumbnail: {
                    url: `https://mc-heads.net/head/${this.bot.uuid}.png`,
                },
                footer: {
                    text: `The "Perfect" Macro Rewrite`,
                    icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
                }
            })
            ws.emit("open", message);
        })

        websocket.on('close', async () => {
            await sleep(5000);
            this.startWs(link);

        })

        websocket.on('message', (message) => {
            const msg = this.parseMessage(message);
            if (this.testMessage(msg)) {
                logmc(msg);
            }
        })

    }

    getWs() { return this.ws };//This is the one that will prob always get used. It's an event emitter so that you can easily sort through the messaages

    getCoflWs() { return this.websocket };//Tbh will prob never get used but

    getCurrentLink() { return this.link };//Might be used for utils or smth idrk

    parseMessage(message) {
        const msg = JSON.parse(message);
        if (!msg || !msg.type) return "no";
        let data = JSON.parse(msg.data)
        let text;
        switch (msg.type) {
            case "flip":
                this.ws.emit("flip", data);
                text = `§6[§bTPM§6] ${customIGNColor(this.ign)}${this.ign} is trying to purchase ${data.itemName}${customIGNColor(this.ign)} for ${formatNumber(data.startingBid)} §7(target ${formatNumber(data.target)})`
                break;
            case "writeToChat":
            case "chatMessage":
                this.ws.emit("message", msg)
                text = smallMessageParse(data);
                this.ws.emit("messageText", text);
                break;
            case "loggedIn":
            case "playSound":
            case "ping":
            case "countdown":
            case "createAuction":
                break;
            case "settings":
                this.ws.emit('jsonSettings', msg)
                break;
            case "getInventory":
                this.ws.emit('getInventory', msg);
                break;
            case "privacySettings":
                this.ws.emit('settings', msg);
                break;
            case "execute":
                if (data.includes('/cofl')) {
                    this.handleCommand(data);
                } else {
                    const packets = getPackets(this.ign);
                    if (!packets) return;
                    packets.sendMessage(data);
                }
                break;
        }
        return text;
    }

    handleCommand(command) {
        const args = command.split(' ');
        const first = args[1];
        args.shift();
        args.shift();
        const joined = JSON.stringify(args.join(' '));
        const send = JSON.stringify({
            type: first,
            data: joined
        })
        this.send(send);
    }

    send(msg, type = true) {
        if (this.websocket?.readyState !== WebSocket.OPEN) {
            if (type) logmc(`§6[§bTPM§6] §cCan't send to websocket because not connected`);
            return;
        }
        this.websocket.send(msg);
        if (type) console.log(msg)
    }

    testMessage(msg) {
        if (!msg) return false;
        msg = noColorCodes(msg);
        if (msg.includes('[Chat]')) return true;//Don't try and use cofl chat to trigger other things :(

        const connectionMatch = msg.match(connectionRegex);
        if (connectionMatch) {
            console.log(`Got connection ID ${connectionMatch[1]}`);
        }

        if (msg.includes(`Until you do you are using the free version which will make less profit and your settings won't be saved`)) {//logged out
            this.handleCommand('/cofl s maxItemsInInventory 1');
            //TODO add webhook here
        }

        if (blockUselessMessages) {
            if (msg.includes('matched your Whitelist')) return false;
        }

        return true;
    }

}

function smallMessageParse(msg) {
    if (Array.isArray(msg)) return msg.map(msg => msg.text).join(' ');
    return msg?.text;
}

module.exports = CoflWs;