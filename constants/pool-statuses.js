// written this way, so that you can't accidentally change those constants elsewhere
module.exports = class {
    static #_CREATED = "CREATED";
    static #_STARTED = "STARTED";
    static #_COMPLETED = "COMPLETED";
    static #_CANCELLED = "CANCELLED";
    static #_ENDED = "ENDED";

    static get CREATED() { return this.#_CREATED; }
    static get STARTED() { return this.#_STARTED; }
    static get COMPLETED() { return this.#_COMPLETED; }
    static get CANCELLED() { return this.#_CANCELLED; }
    static get ENDED() { return this.#_ENDED; }
}