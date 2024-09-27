const { config } = require('../config.js');

const DISCORD_PING = config.discordID == "" ? "" : `<@${config.discordID}>`;

module.exports = { DISCORD_PING };