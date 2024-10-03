const { createBot } = require("mineflayer");
const { logmc, customIGNColor } = require("../logger.js");
const { getPackets, makePackets } = require("./packets.js");

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

        makePackets(ign, bot._client);

        bot.once("login", () => {
            logmc(`${customIGNColor(ign)}${ign} logged in!`);
            resolve(bot);
        });

    });
}

module.exports = { makeBot };