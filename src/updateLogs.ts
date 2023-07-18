import fs from 'node:fs/promises';
import { existsSync } from 'fs';
import path from 'node:path';

const REGEX = /log(?:\.(\d+))?\.txt/i;

const highestLog = (logs: string[]) => {
    let highest = -1;

    for (const log of logs) {
        const match = REGEX.exec(log);
        if (!match) {
            continue;
        }

        const number = Number(match[1]);
        if (isNaN(number)) {
            continue;
        }

        if (number > highest) {
            highest = number;
        }
    }

    return highest;
};

async function run() {
    const logsPath = path.join(__dirname, '..', 'logs');

    if (!existsSync(logsPath)) {
        await fs.mkdir(logsPath);
    }

    const logs = (await fs.readdir(logsPath))
        .map(log => path.join(logsPath, log));

    const highest = highestLog(logs);
    for (let i = highest; i > 0; i--) {
        const filename = path.join(logsPath, `log.${i}.txt`);

        if (i >= 10) {
            await fs.rm(filename);
        } else {
            if (existsSync(filename)) {
                await fs.rename(filename, path.join(logsPath, `log.${i + 1}.txt`));
            }
        }
    }

    if (existsSync(path.join(logsPath, 'log.txt'))) {
        await fs.rename(path.join(logsPath, `log.txt`), path.join(logsPath, `log.1.txt`));
    }
}

run().catch(console.error);
