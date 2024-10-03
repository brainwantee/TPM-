const fs = require('fs');
const { patch } = require('golden-fleece');
const JSON5 = require("json5");

const defaultConfig = `{

    //Put your minecraft IGN here. To use multiple, follow this format: ["account1", "account2"],
    "igns": [""],

    "discordID": "",

    "usInstance": true, 

    "session": "",

    "visitFriend": "",

    "useCookie": true,

    "delay": 250,

    "waittime": 15,

    "clickDelay": 125,

    "bedSpam": false,

    "skip": {

        "always": false,

        "minProfit": 5000000,

        "userFinder": true,

        "skins": true

    }

}`;

const parsedDefaultConfig = JSON5.parse(defaultConfig);

if (!fs.existsSync('./config.json5')) {
    fs.writeFileSync('./config.json5', defaultConfig);
}

let config = { ...parsedDefaultConfig, ...JSON5.parse(fs.readFileSync('./config.json5', 'utf8')) };

function updateConfig(data) {//golden-fleece my savior idk how to spell that
    const newConfig = patch(defaultConfig, data);
    fs.writeFileSync('./config.json5', newConfig, 'utf-8');
}

updateConfig(config);

module.exports = { config, updateConfig };