const axios = require(`axios`);
const { error } = require('../logger.js');

let tokenInfo = {};

async function getTokenInfo(token) {//Guys it's not a rat I swear you're just gonna have to trust me here. This is just so that you can use TPM with NFAs and stuff ;(
    if (tokenInfo[token]) return tokenInfo[token];
    try {

        const headers = {
            headers: {
                "Authorization": `Bearer ${token}`,
            }
        };

        const { id, name } = (await axios.get('https://api.minecraftservices.com/minecraft/profile', headers)).data;

        const data = {
            uuid: id,
            username: name
        }

        tokenInfo[token] = data;

        return data;
    } catch (e) {
        error('Error while fetching Minecraft froom token: ', e);
        return null;
    }
}

module.exports = { getTokenInfo };