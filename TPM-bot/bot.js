const { createBot } = require("mineflayer");

async function makeBot(ign) {
    return new Promise((resolve) => {

        console.log(`Trying to log into ${ign}`);

        const bot = createBot({
            username: ign,
            auth: 'microsoft',
            version: '1.8.9',
            host: 'play.hypixel.net',
        });

        bot.once("login", () => {
            console.log(`${ign} logged in!`);
            resolve(bot); 
        });

    });
}

module.exports = { makeBot };