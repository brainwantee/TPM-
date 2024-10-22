const { config } = require('../config.js');
const { debug, error } = require('../logger.js');
const { webhook } = config;
const axios = require('axios');

const DISCORD_PING = !config.discordID ? "" : `<@${config.discordID}>`;

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

function stripItemName(name) {
    const stripped = noColorCodes(name.replace(/!|-us|\.|\b(?:[1-9]|[1-5][0-9]|6[0-4])x\b/g, ""));
    debug(`Stripped ${name} => ${stripped}`);
    return stripped;
}

function IHATETAXES(price) {
    if (price < 10000000) {
        return price * .98
    } else if (price < 100000000) {
        return price * .97
    } else {
        return price * .965
    }
}

function normalizeDate(dateString) {
    try {
        const isoFormatWithoutMillisUTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
        const isoFormatWithMillisUTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,3}Z$/;
        const isoFormatWithoutMillisOffset = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2})$/;
        const isoFormatWithMillisOffset = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,3}(?:[+-]\d{2}:\d{2})$/;

        if (isoFormatWithoutMillisUTC.test(dateString)) {
            // If the date string does not have milliseconds and ends with 'Z', add them
            return dateString.replace('Z', '.000Z');
        } else if (isoFormatWithMillisUTC.test(dateString)) {
            // Normalize milliseconds to three digits for 'Z'
            return dateString.replace(/(\.\d{1,2})Z$/, (match) => match.slice(0, -1).padEnd(4, '0') + 'Z');
        } else if (isoFormatWithoutMillisOffset.test(dateString)) {
            // If the date string does not have milliseconds and ends with offset, add them
            return dateString.replace(/([+-]\d{2}:\d{2})$/, '.000$1');
        } else if (isoFormatWithMillisOffset.test(dateString)) {
            // Normalize milliseconds to three digits for offset
            return dateString.replace(/(\.\d{1,2})([+-]\d{2}:\d{2})$/, (match, p1, p2) => p1.padEnd(4, '0') + p2);
        } else {
            throw new Error('Invalid date format');
        }
    } catch (error) {
        debug(`Date normalization error: ${error.message} for ${dateString}`);
        return dateString; // Fallback to the original string
    }
}

function getWindowName(window) {
    if (!window) return null;
    try {
        return JSON.parse(window.title).extra[0].text;
    } catch (e) {
        return null;
    }
}

function isSkin(item){
    return item?.includes('✦') || item?.toLowerCase()?.includes('skin') || item?.includes('✿');
}

function noColorCodes(text) {
    return text?.replace(/§./g, '')?.replace('§', '')//cofl sometimes sends messages that are cut off so I need the second one aswell
}

async function sendDiscord(embed, ping = false, attempt = 0) {
    if (webhook) {
        try {
            if (Array.isArray(webhook)) {
                webhook.forEach(async (hook) => {
                    await axios.post(hook, {
                        username: "TPM",
                        avatar_url: "https://media.discordapp.net/attachments/1235761441986969681/1263290313246773311/latest.png?ex=6699b249&is=669860c9&hm=87264b7ddf4acece9663ce4940a05735aecd8697adf1335de8e4f2dda3dbbf07&=&format=webp&quality=lossless",
                        content: ping ? DISCORD_PING : "",
                        embeds: [embed]
                      });
                })
            } else {
                await axios.post(webhook, {
                    username: "TPM",
                    avatar_url: "https://media.discordapp.net/attachments/1235761441986969681/1263290313246773311/latest.png?ex=6699b249&is=669860c9&hm=87264b7ddf4acece9663ce4940a05735aecd8697adf1335de8e4f2dda3dbbf07&=&format=webp&quality=lossless",
                    content: ping ? DISCORD_PING : "",
                    embeds: [embed]
                  });
            }
        } catch(e) {
            error(e)
            if (attempt < 3) {
                await sleep(5000)
                await sendDiscord(embed, attempt + 1);
            }
        }
    }
}



function nicerFinders(finder) {
    switch (finder) {
        case "USER":
            return "User";
        case "SNIPER_MEDIAN":
            return 'Median Sniper';
        case "TFM":
            return "TFM";
        case "AI":
            return 'AI';
        case "CraftCost":
            return "Craft Cost";
        case "SNIPER":
            return 'Sniper';
        case "STONKS":
            return 'Stonks';
        case "FLIPPER":
            return 'Flipper'
    }
    return finder;
}

async function betterOnce(listener, uhhh, timeframe = 5000) {
    return new Promise((resolve) => {
        let sent = false;

        const listen = () => {
            if (!sent) {
                sent = true;
                listener.off(uhhh, listen);
                resolve(true);
            }
        };

        setTimeout(() => {
            if (!sent) {
                listener.off(uhhh, listen);
                resolve(false);
            }
        }, timeframe);

        listener.on(uhhh, listen);
    });
}

function getSlotLore(slot) {
    return slot?.nbt?.value?.display?.value?.Lore?.value?.value;
}

function onlyNumbers(text) {
    return parseInt(text.replace(/[^\d,]/g, '').replace(/,/g, ''), 10);
}

function addCommasToNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function normalNumber(num) {
    if (typeof num === 'number') return num;
    if (!num) return NaN;
    num = num.toLowerCase();
    if (num.includes('t')) {
        return parseFloat(num.replace('t', '')) * 1_000_000_000_000;
    } else if (num.includes('b')) {
        return parseFloat(num.replace('b', '')) * 1_000_000_000;
    } else if (num.includes('m')) {
        return parseFloat(num.replace('m', '')) * 1_000_000;
    } else if (num.includes('k')) {
        return parseFloat(num.replace('k', '')) * 1_000;
    }
    return parseFloat(num);
}

function isSkinned(item) {
    return item.includes('✦') || item.toLowerCase().includes('skin') || item.includes('✿');
}

function getLatestLog(){
    const logFilePath = path.join(process.pkg ? path.dirname(process.execPath) : __dirname, 'logs', 'latest.log');
    const logFile = fs.createReadStream(logFilePath);
    const form = new FormData();
    form.append('file', logFile, 'latest.log');
    return form;
}

module.exports = { DISCORD_PING, getLatestLog, isSkinned, normalNumber, addCommasToNumber, onlyNumbers, getSlotLore, formatNumber, sleep, betterOnce, stripItemName, IHATETAXES, normalizeDate, getWindowName, isSkin, noColorCodes, sendDiscord, nicerFinders, betterOnce };