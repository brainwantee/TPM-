const axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');

const { config, updateConfig } = require('../config.js');
const { logmc, customIGNColor } = require('../logger.js');
const { DISCORD_PING, formatNumber } = require('./Utils.js');
const { getPackets } = require('./packets.js');

const { useBafSocket, usInstance } = config;

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
            link = `${usInstance ? 'ws://sky-us.' : 'wss://sky.'}coflnet.com/modsocket?version=${useBafSocket ? '1.5.1-af' : '1.5.6-Alpha'}&player=${this.ign}&SId=${config.session}`;
            this.link = link;
        }

        this.websocket = new WebSocket(link);
        const { websocket, ws } = this;//screw "this" 

        websocket.on('open', (message) => {
            console.log(`Started cofl connection!`);
            ws.emit("open", message);
        })

        websocket.on('message', (message) => {
            const msg = this.parseMessage(message);
            logmc(msg);
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
                if (useBafSocket) {
                    text = `§6[§bTPM§6] ${customIGNColor(this.ign)}${this.ign} is trying to purchase ${data.itemName}${customIGNColor(this.ign)} for ${formatNumber(data.startingBid)} §7(target ${formatNumber(data.target)})`
                } else {
                    text = smallMessageParse(data);
                }
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
                    handleCommand(data);
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
        this.send(
            JSON.stringify({
                type: first,
                data: joined
            })
        );
    }

    send(msg, type = true) {
        if (this.websocket?.readyState !== WebSocket.OPEN) {
            if (type) logmc(`§6[§bTPM§6] §cCan't send to websocket because not connected`);
            return;
        }
        this.websocket.send(msg);
        console.log(msg)
    }

}

function smallMessageParse(msg) {
    if (Array.isArray(msg)) return msg.map(msg => msg.text).join(' ');
    return msg?.text;
}

module.exports = CoflWs;