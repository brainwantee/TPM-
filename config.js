const fs = require('fs');
const { patch } = require('golden-fleece');
const JSON5 = require("json5");

const defaultConfig = `{

    //Put your minecraft IGN here. To use multiple, follow this format: ["account1", "account2"],
    "igns": [""],

    "discordID": "",

    "webhook": "",

    "webhookFormat": "You bought {0} for {2} ({1}, {3}) in {4}ms [{5}]",

    "usInstance": true, 

    "visitFriend": "",

    "useCookie": true,

    "delay": 250,

    "waittime": 15,

    "clickDelay": 125,

    "bedSpam": false,

    "blockUselessMessages": true,

    "skip": {

        "always": false,

        "minProfit": 5000000,

        "userFinder": true,

        "skins": true

    },
    
    "session": ""


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