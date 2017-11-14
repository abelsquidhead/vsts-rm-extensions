import { Logger } from './logger';
export class Worker<T> {
    private execute: (item : T) => Promise<void>;
    private getNextItem: () => T;
    private canExit: () => boolean;

    private id: number;

    constructor(id: number, execute: (item : T) => Promise<void>, getNextItem: () => T, canExit: () => boolean) {
        this.id = id;
        this.execute = execute;
        this.getNextItem = getNextItem;
        this.canExit = canExit;
    }

    init(): Promise<void> {
        var promise = new Promise<void>(async (resolve, reject) => {
            let spawnWorkerPromise = this.spawnWorker(resolve, reject);
            spawnWorkerPromise.catch(reason => {
                throw reason;
            });
            
            await spawnWorkerPromise;
        });

        return promise;
    }

    async spawnWorker(resolve, reject) {
        try {
            let workerPromise = this.workerImplementation();
            workerPromise.catch(reason => {
                reject(reason);
            });

            if (this.canExit()) {
                Logger.logInfo(`Exiting worker ${this.id} nothing more to process`);
                resolve();
            }
            else {
                Logger.logInfo(`Spawn worker ${this.id} after 1 sec to check for items again.`);
                setTimeout(() => this.spawnWorker(resolve, reject), 1000);
            }
        }
        catch (err) {
            reject(err);
        }
    }
    
    async workerImplementation() {
        while (true) {
            const item = this.getNextItem();
            if (!item) {
                Logger.logInfo(`Nothing more to process, exiting workerImplementation for worker ${this.id}.`);
                break;
            }

            let executePromise = this.execute(item);
            executePromise.catch(reason => {
                throw reason;
            });

            await executePromise;
        }
    }
}