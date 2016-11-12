class Bus {
  constructor() {
    this.listeners = {};
    this.status = new Map();
  }

  // Events
  on(event, cb) {
    if(!(event in this.listeners)) this.listeners[event] = new Set();
    this.listeners[event].add(cb);
  }

  off(event, cb) {
    if(this.listeners[event]) this.listeners[event].delete(cb);
  }

  once(event, cb) {
    this.on(event, (...args) => {
      this.off(event, cb);
      cb(...args);
    });
  }

  emit(event, ...args) {
    if(event in this.listeners)
      for(const l of this.listeners[event])
        l(...args);
  }

  // Status
  set(name, value) {
    this.status.set(name, value);
  }

  get(name) {
    return this.status.get(name);
  }
}

export default new Bus();
