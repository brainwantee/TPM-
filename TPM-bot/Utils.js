const { config } = require('../config.js');

const DISCORD_PING = config.discordID == "" ? "" : `<@${config.discordID}>`;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function formatNumber(num) {
    let negative = num < 0;
    num = Math.abs(num);
    let thingy;
    if (num >= 1000000000) {
        thingy = (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
        thingy = (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        thingy = (num / 1000).toFixed(1) + 'K';
    } else {
        thingy = num.toString();
    }
    return `${negative ? '-' : ''}${thingy}`;
}

async function betterOnce(listener, event, timeframe = 5000) {
    return new Promise((resolve, reject) => {

        const listen = (msg) => {
            listener.off(event, listen);
            resolve(msg);
        };

        setTimeout(() => {
            listener.off(event, listen);
            reject(`Didn't find in time!`);
        }, timeframe);

        listener.on(event, listen);
    });
}

module.exports = { DISCORD_PING, formatNumber, sleep, betterOnce };