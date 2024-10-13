const { logmc } = require('./logger.js');
const { sleep } = require('./TPM-bot/Utils.js');

const WebSocket = require('ws');

class TpmSocket {

    constructor(botList) {
        this.ws = null;
        this.botList = botList;
        this.makeWebsocket();
        this.sentFailureMessage = false;
        this.storedMessages = [];//if socket is down, send all of these at once
    }

    makeWebsocket() {
        try {
            this.ws = new WebSocket('ws://107.152.38.30:1241');//random VPS

            this.ws.on('open', () => {
                this.sentFailureMessage = false;
                logmc('§6[§bTPM§6] §3Connected to the TPM websocket!');
                if (this.storedMessages.length > 0) {
                    this.send(JSON.stringify({
                        type: "batch",
                        data: JSON.stringify(this.storedMessages)
                    }))
                }
            })

            this.ws.on('error', async (e) => {
                if (e.code === 'ECONNREFUSED') {
                    if (!this.sentFailureMessage) {
                        logmc('§6[§bTPM§6] §cTPM websocket down. Please report to a dev!');
                        this.sentFailureMessage = true;
                    }
                } else {
                    console.error('WS error:', e);
                }
                sleep(5000);
                this.makeWebsocket();
            });

            this.ws.on('message', this.handleMessage);

        } catch (e) {
            console.error(`WS error:`, e);
        }
    }

    send(message, batch = true) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
        } else if (batch) {
            this.storedMessages.push(message);
        }
    }

    handleMessage(message) {
        const msg = JSON.parse(message);
        const data = JSON.parse(msg.data);//This isn't safe and if it's not JSON format then it'll crash but that's intentional!
        
    }

}

module.exports = TpmSocket;