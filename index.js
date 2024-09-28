const AhBot = require('./TPM-bot/AhBot.js');
const { config, updateConfig } = require('./config.js');
const prompt = require('prompt-sync')();

let igns = config.igns;

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

async function startBot(){
    let bots = {};

    for(const ign of igns){
        bots[ign] = new AhBot(ign);
        await bots[ign].createBot();
    }

}

module.exports = startBot;