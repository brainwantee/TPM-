let packetsObject = {};

function makePackets(ign, client) {
    packetsObject[ign] = {
        sendMessage: function (text) {
            client.write('chat', {
                message: text
            })
        },
        click: function (slot, id, itemID) {
            client.write('window_click', {
                windowId: id,
                slot: slot,
                mouseButton: 2,
                mode: 3,
                item: { "blockId": itemID },
                action: this.actionID
            })
            this.actionID++;
        },
        bump: function () {
            this.actionID++;
        },
        confirmClick: function (windowID) {
            client.write('transaction', {
                windowId: windowID,
                action: actionID,
                accepted: true
            })
        },
        actionID: 1
    }
}

function getPackets(ign) {
    const packets = packetsObject[ign];
    if (packets) return packets;
    console.error(`No packets made for ${ign}`);
    return null;
}

module.exports = { getPackets, makePackets };