const { createBot } = require("mineflayer");
const { logmc, customIGNColor } = require("../logger.js");
const { getPackets, makePackets } = require("./packets.js");
const axios = require('axios');

async function makeBot(ign) {
    return new Promise((resolve) => {

        logmc(`${customIGNColor(ign)}Trying to log into ${ign}`);

        const bot = createBot({
            username: ign,
            auth: 'microsoft',
            version: '1.8.9',
            host: 'play.hypixel.net',
        });

        bot.betterClick = function (slot, mode1 = 0, mode2 = 0) {
            if (!bot.currentWindow) {
                console.log(`No window found for clicking ${slot}`);
                return;
            }
            let packets = getPackets(ign);
            if (!packets) {
                console.log(`Packets weren't made for betterclick`);
                return;
            }
            packets.bump();
            bot.currentWindow.requiresConfirmation = false;
            bot.clickWindow(slot, mode1, mode2);
        };

        bot.betterWindowClose = function () {

            if (!bot.currentWindow) {
                console.log(`No window found for closing`);
                return;
            }

            try { bot.closeWindow(bot.currentWindow) } catch { };

        };

        bot.editSign = function(line){
            bot._client.write('update_sign', {
                location: bot.entity.position.offset(-1, 0, 0),
                text1: line,
                text2: '{"italic":false,"extra":["^^^^^^^^^^^^^^^"],"text":""}',
                text3: '{"italic":false,"extra":["    Auction    "],"text":""}',
                text4: '{"italic":false,"extra":["     hours     "],"text":""}'
              });
        };

        makePackets(ign, bot._client);

        bot.once("login", async () => {
            bot.uuid = await getUUID(ign);
            logmc(`${customIGNColor(ign)}${ign} logged in!`);
            resolve(bot);
        });

    });
}

async function getUUID(ign, attempt = 0) {
    if(attempt == 3) return null;
    try {
        return (await axios.get(`https://api.mojang.com/users/profiles/minecraft/${ign}`)).data.id;
    } catch(e) {
        console.log(e);
        return getUUID(ign, ++attempt);
    }
}

module.exports = { makeBot };