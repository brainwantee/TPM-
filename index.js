const prompt = require('prompt-sync')();
const { randomUUID } = require('crypto');
const { logmc, updateIgns, getIgns } = require('./logger.js');
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const AhBot = require('./TPM-bot/AhBot.js');
const TpmSocket = require('./TpmSocket.js');
const { sendDiscord } = require('./TPM-bot/Utils.js');
const { config, updateConfig } = require('./config.js');

let { igns, autoRotate } = config;
let bots = {};
let askPrefixes = {};
let tws;

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

    tws = new TpmSocket(bots, destroyBot, startBot);

    for (const ign of igns) {
        await startBot(ign, tws);
        message += `Logged in as \`\`${ign}\`\`\n`;
    }

    let thumbnail = 'https://images-ext-1.discordapp.net/external/7YiWo1jf2r78hL_2HpVRGNDcx_Nov0aDjtrG7AZ4Hxc/%3Fsize%3D4096/https/cdn.discordapp.com/icons/1261825756615540836/983ecb82e285eee55ef25dd2bfbe9d4d.png?format=webp&quality=lossless&width=889&height=889';

    const botNames = Object.keys(bots);

    if (botNames.length == 1) {
        thumbnail = `https://mc-heads.net/head/${bots[botNames[0]].getBot().uuid}.png`;
    }

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

async function destroyBot(ign, secondary = true) {
    const ahBot = bots[ign];
    if (!ahBot) return;
    const bot = ahBot.getBot();
    ahBot.stop();
    delete askPrefixes[bots[ign].initAskPrefix(igns)?.toLowerCase()]
    delete bots[ign];
    if (secondary) {
        sendDiscord({
            title: 'Killed bot',
            color: 13320532,
            fields: [
                {
                    name: '',
                    value: `Rip ${ign}`,
                }
            ],
            thumbnail: {
                url: `https://mc-heads.net/head/${bot.uuid}.png`,
            },
            footer: {
                text: `The "Perfect" Macro Rewrite`,
                icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
            }
        })
    }

}

async function startBot(ign, tws, secondary = false) {
    return new Promise(async (resolve) => {
        const tempBot = new AhBot(ign, tws);
        await tempBot.createBot();
        bots[ign] = tempBot;
        askPrefixes[bots[ign].initAskPrefix(igns)?.toLowerCase()] = ign;
        updateIgns(ign);
        if (autoRotate[ign]) {
            rotate(ign);
        }
        if (secondary) {
            sendDiscord({
                title: 'Started flipping',
                color: 16629250,
                fields: [
                    {
                        name: '',
                        value: `Logged in as \`\`${ign}\`\`\n`,
                    }
                ],
                thumbnail: {
                    url: `https://mc-heads.net/head/${tempBot.getBot().uuid}.png`,
                },
                footer: {
                    text: `The "Perfect" Macro Rewrite`,
                    icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
                }
            })
        }
        resolve();
    })
}

function rotate(ign) {
    const timings = autoRotate[ign].split(':');
    const start = timings[0] * 3_600_000;
    const stop = timings[1] * 3_600_000;
    const bot = bots[ign].getBot();
    setTimeout(() => {
        destroyBot(ign, false);
        sendDiscord({
            title: 'Killed bot',
            color: 13320532,
            fields: [
                {
                    name: '',
                    value: `Rip \`\`${ign}\`\`\n Will log on in <t:${Math.round((Date.now() + start) / 1000)}:R>`,
                }
            ],
            thumbnail: {
                url: `https://mc-heads.net/head/${bot.uuid}.png`,
            },
            footer: {
                text: `The "Perfect" Macro Rewrite`,
                icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
            }
        })
        setTimeout(() => {
            startBot(ign, tws);
            sendDiscord({
                title: 'Started flipping',
                color: 16629250,
                fields: [
                    {
                        name: '',
                        value: `Logged in as \`\`${ign}\`\`\n Will log off in <t:${Math.round((Date.now() + stop) / 1000)}:R>`,
                    }
                ],
                thumbnail: {
                    url: `https://mc-heads.net/head/${bot.uuid}.png`,
                },
                footer: {
                    text: `The "Perfect" Macro Rewrite`,
                    icon_url: 'https://media.discordapp.net/attachments/1223361756383154347/1263302280623427604/capybara-square-1.png?ex=6699bd6e&is=66986bee&hm=d18d0749db4fc3199c20ff973c25ac7fd3ecf5263b972cc0bafea38788cef9f3&=&format=webp&quality=lossless&width=437&height=437',
                }
            })
        }, start);
    }, stop);
}

function askUser() {
    rl.question(`> `, async (input) => {
        const args = input.trim().split(/\s+/);
        let bot;
        if (getIgns().length === 0) {
            logmc(`No accounts currently running! Start one from discord`);
            askUser();
            return;
        }
        if (getIgns().length !== 1) {
            let prefix = args[0].toLowerCase().substring(0, 3);
            let askPrefix = askPrefixes[prefix];
            args.shift();
            if (askPrefix) {
                bot = bots[askPrefix];
            } else {
                logmc(`Hey that's not a valid prefix! Use one of these: ${Object.keys(askPrefixes).join(', ')}`);
                askUser();
                return;
            }
        } else {
            bot = bots[getIgns()[0]];
        }
        let message = args.slice(1).join(' ');
        if (bot) bot.handleTerminal(args[0], message);
        askUser();
    });
}

askUser();