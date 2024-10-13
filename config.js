const fs = require('fs');
const { patch } = require('golden-fleece');
const JSON5 = require("json5");

const defaultConfig = `{

    //Put your minecraft IGN here. To use multiple, follow this format: ["account1", "account2"],
    "igns": [""],

    "discordID": "",

    "webhook": "",

    "webhookFormat": "You bought [\`\`{0}\`\`](https://sky.coflnet.com/auction/{7}) for \`\`{2}\`\` (\`\`{1}\`\` profit) in \`\`{4}ms\`\`",
    
    "visitFriend": "",

    "useCookie": true,

    "relist": true,

    "delay": 250,

    "waittime": 15,

    "percentOfTarget": [0, 10000000000, 97],

    "clickDelay": 125,

    "listHours": 48,

    "bedSpam": false,

    "blockUselessMessages": true,

    "skip": {

        "always": false,

        "minProfit": 5000000,

        "userFinder": true,

        "skins": true

    },

    "doNotRelist": {

        "profitOver": "50m",

        "skinned": true,

        "tags": ["HYPERION"],

        "finders": ["USER"]

    },
    
    "session": ""

}`;

const parsedDefaultConfig = JSON5.parse(defaultConfig);

if (!fs.existsSync('./config.json5')) {
    fs.writeFileSync('./config.json5', defaultConfig);
}

let config = { ...parsedDefaultConfig, ...JSON5.parse(fs.readFileSync('./config.json5', 'utf8')) };

config.doNotRelist = { ...parsedDefaultConfig.doNotRelist, ...config.doNotRelist }
config.skip = { ...parsedDefaultConfig.skip, ...config.skip };

function updateConfig(data) {//golden-fleece my savior idk how to spell that
    const newConfig = patch(defaultConfig, data);
    fs.writeFileSync('./config.json5', newConfig, 'utf-8');
}

updateConfig(config);

module.exports = { config, updateConfig };