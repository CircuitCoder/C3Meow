class Bus {
  constructor() {
    this.listeners = {};
  }

  on(event, cb) {
    if(!(event in this.listeners)) this.listeners[event] = new Set();
    this.listeners[event].add(cb);
  }

  off(event, cb) {
    if(this.listeners[event]) this.listeners[event].delete(cb);
  }

  emit(event, ...args) {
    if(event in this.listeners)
      for(const l of this.listeners[event])
        l(...args);
  }
}

export default new Bus();
