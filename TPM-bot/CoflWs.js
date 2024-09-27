const axios = require('axios');
const WebSocket = require('ws');
const { config, updateConfig } = require('../config.js');
const EventEmitter = require('events');
const { DISCORD_PING } = require('./Utils.js');

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
            link = `${config.usInstance ? 'ws://sky-us.' : 'wss://sky.'}coflnet.com/modsocket?version=${config.useBafSocket ? '1.5.1-af' : '1.5.6-Alpha'}&player=${this.ign}&SId=${config.session}`;
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
            console.log(message.toString());
        })

    }

    getWs() { return this.ws };//This is the one that will prob always get used. It's an event emitter so that you can easily sort through the messaages

    getCoflWs() { return this.websocket };//Tbh will prob never get used but

    getCurrentLink() { return this.link };//Might be used for utils or smth idrk

    parseMessage(message) {

    }

}

module.exports = CoflWs;