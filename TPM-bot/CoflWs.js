const axios = require('axios');
const WebSocket = require('ws');
const { config, updateConfig } = require('../config.js');
const EventEmitter = require('events');
const { DISCORD_PING, formatNumber } = require('./Utils.js');

const { useBafSocket, usInstance } = config;

class CoflWs {

    constructor(ign, bot) {
        this.ws = new EventEmitter();
        this.websocket = null;
        this.link = null;
        this.ign = ign;
        this.bot = bot;
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
            console.log(msg);
        })

    }

    getWs() { return this.ws };//This is the one that will prob always get used. It's an event emitter so that you can easily sort through the messaages

    getCoflWs() { return this.websocket };//Tbh will prob never get used but

    getCurrentLink() { return this.link };//Might be used for utils or smth idrk

    parseMessage(message) {
        const msg = JSON.parse(message);
        if (!msg || !msg.type) return  "no";
        let data = JSON.parse(msg.data)
        let text;
        switch (msg.type) {
            case "flip":
                this.ws.emit("flip", data);
                if (useBafSocket) {
                    text = `§6[§bTPM§6] §eTrying to purchase ${data.itemName}§e for ${formatNumber(data.startingBid)} §7(target ${formatNumber(data.target)})`
                } else {
                    text = smallMessageParse(data);
                }
                break;
            case "writeToChat":
            case "chatMessage":
                this.ws.emit("message", msg)
                text = smallMessageParse(data);
                console.log(text);
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
                this.ws.emit('settings', fr);
                break;
            case "execute":
                /*if (data.includes('/cofl')) {
                    handleCommand(data);
                } else {
                    const packets = getPackets();
                    if (!packets) return;
                    packets.sendMessage(data);
                }*/
                break;
        }
        return text;
    }

}

function smallMessageParse(msg) {
    if (Array.isArray(msg)) return msg.map(msg => msg.text).join(' ');
    return msg?.text;
}

module.exports = CoflWs;