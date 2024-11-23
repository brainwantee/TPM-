const { createLogger, format, transports } = require('winston');
const { combine, printf, colorize } = format;
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
const axios = require('axios');

let messages = [];
let tracking = false;
let currentIgns = [];
let ignColors = {};
const directoryPath = './logs';

const colors = {
    '1': '\x1b[34m', // dark blue
    '2': '\x1b[32m', // dark green
    '3': '\x1b[36m', // dark cyan
    '4': '\x1b[31m', // dark red
    '6': '\x1b[33m', // dark yellow
    '9': '\x1b[94m', // light blue
    'a': '\x1b[92m', // light green
    'b': '\x1b[96m', // light cyan
    'c': '\x1b[91m', // light red
    'd': '\x1b[95m', // light magenta
    'e': '\x1b[93m', // yellow
    '7': '\x1b[37m', // light gray
    '8': '\x1b[90m', // dark gray
    'f': '\x1b[97m', // white
    '0': '\x1b[30m', // black
    '5': '\x1b[35m'  // dark magenta
};

const colorKeys = Object.keys(colors);
const badColors = new Set(['§0', '§5', '§f', '§8', '§7', '§2', '§9']);

function updateIgns(ign) {
    currentIgns.push(ign);
}

function removeIgn(ign) {
    const index = currentIgns.indexOf(ign);
    if (index === -1) {
        debug(`Failed to remove ${ign} from ${JSON.stringify(currentIgns)}`);
        return;
    }

    currentIgns.splice(index, 1);

}

function getIgns() {
    return currentIgns;
}

async function logmc(string) {
    let msg = '';
    if (!string) return;
    if (tracking) messages.push(string.replace(/§./g, ''));
    let split = string.split('§');
    msg += split[0];

    for (let a of string.split('§').slice(1, split.length)) {
        let color = a.charAt(0);
        let message = a.substring(1, a.length);

        if (colors[color]) {
            msg += colors[color];
        }
        msg += message;
    }

    info('\x1b[0m\x1b[1m\x1b[90m' + msg + '\x1b[0m');
}

function getPrefix(ign) {
    if (currentIgns.length === 1) return "";
    return `${customIGNColor(ign)}${ign}: `
}

function customIGNColor(ign) {
    if (ignColors[ign]) return ignColors[ign];
    const randomColor = "§" + colorKeys[Math.floor(Math.random() * 11)];
    if (Object.values(ignColors).includes(randomColor) || badColors.has(randomColor)) return customIGNColor(ign);
    ignColors[ign] = randomColor;
    return randomColor;
}

//winston stuff below
if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath);
}

function formatDate() {
    const date = new Date();

    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';

    hours = hours % 12;
    hours = hours ? hours : 12;
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2);
    const formattedDate = `${month}-${day}-${year}_${hours}-${strMinutes}${ampm}`;
    return formattedDate;
}

const latestLogPath = `${directoryPath}/latest.log`;
const timelog = `${directoryPath}/${formatDate()}.log`;

if (!fs.existsSync(latestLogPath)) {
    fs.writeFileSync(latestLogPath, '');
} else {
    fs.truncateSync(latestLogPath, 0);
}

// Regex to match ANSI escape sequences
const ansiRegex = /\x1b\[[0-9;]*m/g;

const regex = /[a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|;:'",. <>/?`~\\]/g;

const plainFormat = printf(({ message }) => {
    message = message.replace(ansiRegex, '');
    message = message.match(regex)?.join('') || '';
    return `${Date.now()}: ${message}`;
});

const normalFormat = printf(({ message }) => {
    return message;
});

const logger = createLogger({
    level: 'silly',
    transports: [
        new transports.Console({
            level: 'info',
            format: combine(
                colorize(),
                normalFormat
            )
        }),
        new transports.File({
            filename: latestLogPath,
            format: plainFormat
        }),
        new transports.File({
            filename: timelog,
            format: plainFormat
        })
    ]
});

async function silly(...args) {
    logger.silly(args.join(' '), "silly");
}

async function debug(...args) {
    logger.debug(args.join(' '), "debug");
}

async function error(...args) {
    logger.error(args.join(' '), "error");
}

async function info(...args) {
    logger.info(args.join(' '), "info");
}

function getLatestLog() {
    const logFilePath = path.join(process.pkg ? path.dirname(process.execPath) : __dirname, 'logs', 'latest.log');
    if (!fs.existsSync(logFilePath)) {
        throw new Error(`Log file not found at ${logFilePath}`);
    }
    const logFile = fs.createReadStream(logFilePath);
    const form = new FormData();
    form.append('file', logFile, 'latest.log');
    return form;
}

async function startTracker(timer = 10_000) {
    tracking = true;
    messages = [];
    await new Promise((resolve) => {
        setTimeout(resolve, timer)
    })
    tracking = false;
    return messages;
}

module.exports = { logmc, customIGNColor, silly, debug, error, info, getPrefix, updateIgns, removeIgn, getIgns, startTracker, getLatestLog };