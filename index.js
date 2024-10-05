const prompt = require('prompt-sync')();
const { randomUUID } = require('crypto');
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const AhBot = require('./TPM-bot/AhBot.js');
const { sendDiscord } = require('./TPM-bot/Utils.js');
const { config, updateConfig } = require('./config.js');

let igns = config.igns;
let bots = {};
let askPrefixes = {};

function testIgn() {
    if (igns[0].trim() === "") {
        const newIgn = (prompt(`What's your minecraft name (caps matter): `)).trim();
        if (newIgn !== "") {
            igns[0] = newIgn;
            config.igns = igns;
            updateConfig(config);
        } else {
            testIgn();
        }
    }
}

testIgn();

(async () => {

    if (!config.session) {
        config.session = randomUUID();
        updateConfig(config);
    }

    let message = '';

    for (const ign of igns) {
        bots[ign] = new AhBot(ign);
        await bots[ign].createBot();
        askPrefixes[bots[ign].initAskPrefix()?.toLowerCase()] = ign;
        message += `Logged in as \`\`${ign}\`\`\n`;
    }
    
    let thumbnail = 

    sendDiscord({
        title: 'Started flipping',
        color: 16629250,
        fields: [
            {
                name: '',
                value: message,
            }
        ],
        thumbnail: {
            url: thumbnail,
        },
        footer: {
            text: `The "Perfect" Macro Rewrite`,
            icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
        }
    })

})();

function askUser() {
    rl.question(`> `, async (input) => {
        const args = input.trim().split(/\s+/);
        let bot;
        if (igns.length !== 1) {
            let prefix = args[0].toLowerCase().substring(0, 3);
            let askPrefix = askPrefixes[prefix];
            args.shift();
            if (askPrefix) {
                bot = bots[askPrefix];
            } else {
                console.error(`Hey that's not a valid prefix! Use one of these: ${Object.keys(askPrefixes).join(', ')}`);
                askUser();
                return;
            }
        } else {
            bot = bots[igns[0]];
        }
        let message = args.slice(1).join(' ');
        bot.handleTerminal(args[0], message);
        askUser();
    });
}

askUser();