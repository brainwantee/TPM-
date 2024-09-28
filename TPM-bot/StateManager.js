let queue = [];

class StateManager {

    constructor() {
        this.state = 'moving';
    }

    setState(newState) {
        this.state = newState;
    }

    getState() {
        return this.state;
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