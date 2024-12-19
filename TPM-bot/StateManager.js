const { debug, error } = require('../logger.js');
const fs = require('fs');
const path = require('path');

class StateManager {

    constructor(bot) {
        this.state = 'moving';
        this.lastaction = Date.now();
        this.bot = bot;
        this.queue = [];
        this.setQueue();
    }

    setQueue() {
        const savedData = this.getFile("SavedData", `${this.bot.uuid}.json`);
        if (!savedData) return;
        this.queue = savedData.queue;
    }

    set(newState) {
        debug(`Set state to ${newState}`);
        this.state = newState;
    }

    get() {
        return this.state;
    }

    setAction(time = Date.now()) {
        this.lastaction = time;
    }

    getTime() {
        return this.lastaction;
    }

    getHighest() {
        return this.queue[0] || null;
    }

    queueAdd(action, state, priority) {
        this.queue.push({ action: action, state: state, priority: priority });
        this.queue.sort((a, b) => a.priority - b.priority);
        debug(JSON.stringify(this.queue));
        this.saveQueue();
    }

    queueRemove() {
        debug(`Removing ${JSON.stringify(this.queue[0])} from queue`);
        this.queue.shift();
        this.saveQueue();
    }

    getQueue() {
        return this.queue;
    }

    saveQueue(bidData = null) {
        let toSave = {};
        debug(`Saving queue`, bidData)
        if (!bidData) {
            const savedData = this.getFile("SavedData", `${this.bot.uuid}.json`);
            if (!savedData) {
                toSave = {
                    "bidData": {},
                }
            } else {
                toSave = savedData;
            }
        } else {
            toSave.bidData = bidData;
        }
        toSave.queue = this.queue.filter(action => action.state == "listing" || action.state == "listingNoName");
        this.saveData("SavedData", `${this.bot.uuid}.json`, toSave)
    }

    getFile(folder, name) {
        const filePath = path.join(process.pkg ? path.dirname(process.execPath) : __dirname, folder, name);
        try {
            if (fs.existsSync(filePath)) {
                const rawData = fs.readFileSync(filePath, 'utf8');
                if (rawData.trim().length === 0) {
                    return null;
                }
                try {
                    const jsonData = JSON.parse(rawData);
                    return jsonData;
                } catch {
                    return null;
                }
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    saveData(folder, name, data) {
        try {
            const jsonData = JSON.stringify(data, null, 2);
            const dirPath = path.join(process.pkg ? path.dirname(process.execPath) : __dirname, folder);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            const filePath = path.join(dirPath, name);
            fs.writeFileSync(filePath, jsonData, (err) => {
                if (err) {
                    error(`Error writing data to ${filePath}: ${err}`);
                }
            });
        } catch (e) {
            error(e);
            error(data);
        }
    }

}

module.exports = StateManager;