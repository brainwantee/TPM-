const prompt = require('prompt-sync')();
const { randomUUID } = require('crypto');
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const AhBot = require('./TPM-bot/AhBot.js');
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

    for (const ign of igns) {
        bots[ign] = new AhBot(ign);
        await bots[ign].createBot();
        askPrefixes[bots[ign].initAskPrefix()?.toLowerCase()] = ign;
    }

})();

function askUser() {
    rl.question(`> `, async (input) => {
        const args = input.trim().split(/\s+/);
        let bot;
        if (igns.length !== 1) {
            let prefix = args[0].toLowerCase();
            let askPrefix = askPrefixes[prefix];
            args.shift();
            if(askPrefix){
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