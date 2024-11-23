const { debug } = require('../logger.js');

class StateManager {

    constructor(bot) {
        this.state = 'moving';
        this.lastaction = Date.now();
        this.bot = bot;
        this.queue = [];
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
    }

    queueRemove() {
        debug(`Removing ${JSON.stringify(this.queue[0])} from queue`);
        this.queue.shift();
    }

    getQueue() {
        return this.queue;
    }

}

module.exports = StateManager;