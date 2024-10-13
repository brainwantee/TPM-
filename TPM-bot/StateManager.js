const { config } = require('../config.js');
const { delay } = config;

let queue = [];

class StateManager {

    constructor(bot) {
        this.state = 'moving';
        this.lastaction = Date.now();
        this.bot = bot;
    }

    set(newState) {
        console.log(`Set state to ${newState}`);
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
        return queue[0] || null;
    }

    queueAdd(action, state, priority) {
        queue.push({ action: action, state: state, priority: priority });
        queue.sort((a, b) => b.priority - a.priority);
        console.log(queue);
    }

    queueRemove(){
        queue.shift();
    }

}

module.exports = StateManager;