let queue = [];

class StateManager {

    constructor() {
        this.state = 'moving';
        this.lastaction = Date.now();
    }

    set(newState) {
        console.log(`Set state to ${newState}`);
        this.state = newState;
    }

    get() {
        return this.state;
    }

    setAction(time) {
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
    }

}

module.exports = StateManager;