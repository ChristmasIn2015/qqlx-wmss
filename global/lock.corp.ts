const AsyncLock = require("async-lock");

export class CorpLock {
    constructor() {}

    private corpLockMap = new Map<string, any>();

    getLock(corpId: string) {
        if (!this.corpLockMap.get(corpId)) this.corpLockMap.set(corpId, new AsyncLock());
        const lock = this.corpLockMap.get(corpId);
        return lock;
    }
}
