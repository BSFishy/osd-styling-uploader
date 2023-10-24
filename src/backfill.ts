import { ensureIndexExists, processDeclaration, deleteOld } from './os';
import { getRoot, getScssFiles, getFileContents, processFiles } from './navigate';
import { checkEnv } from './helpers';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log, clone, checkout, ReadCommitResult } from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import 'dotenv/config';

// Configure these dates
const DATE_START = [10, 1, 2023];
const DATE_END = [10, 24, 2023];

const START_DATE = new Date(DATE_START[2], DATE_START[0] - 1, DATE_START[1], 10);
const END_DATE = new Date(DATE_END[2], DATE_END[0] - 1, DATE_END[1], 10);

const DATE_RANGE = generateRange();

async function run() {
    checkEnv();

    console.log(`Running at ${new Date().toISOString()}`);
    const root = getRoot(process.argv[2] ?? process.env.DEFAULT_PATH);

    console.log('Ensuring indices exist');
    await ensureIndexExists('css');

    await cloneRepos(root);
    const logs = await grabLogs(root);
    await processBackfill(root, logs);

    console.log('Done!');
}

const REPOS = [
    ['observability', 'https://github.com/opensearch-project/dashboards-observability.git'],
    ['reporting', 'https://github.com/opensearch-project/dashboards-reporting.git'],
    ['visualizations', 'https://github.com/opensearch-project/dashboards-visualizations.git'],
    ['query-workbench', 'https://github.com/opensearch-project/dashboards-query-workbench.git'],
    ['maps', 'https://github.com/opensearch-project/dashboards-maps.git'],
    ['anomaly-detection', 'https://github.com/opensearch-project/anomaly-detection-dashboards-plugin.git'],
    ['ml-commons', 'https://github.com/opensearch-project/ml-commons-dashboards.git'],
    ['index-management', 'https://github.com/opensearch-project/index-management-dashboards-plugin.git'],
    ['notifications', 'https://github.com/opensearch-project/dashboards-notifications.git'],
    ['alerting', 'https://github.com/opensearch-project/alerting-dashboards-plugin.git'],
    ['security-analytics', 'https://github.com/opensearch-project/security-analytics-dashboards-plugin.git'],
    ['security', 'https://github.com/opensearch-project/security-dashboards-plugin.git'],
    ['search-relevance', 'https://github.com/opensearch-project/dashboards-search-relevance.git'],
];

const REPO_NAMES = REPOS.map(repo => repo[0]);

const cloneRepos = async (root: string) => {
    console.log('Cloning Dashboards');

    await clone({
        dir: root,
        fs,
        http,
        url: 'https://github.com/opensearch-project/OpenSearch-Dashboards.git',
        since: START_DATE,
        singleBranch: true,
        remote: 'origin',
    });

    const promises = [];
    for (const [name, url] of REPOS) {
        console.log(`Cloning ${name}`);

        promises.push(clone({
            dir: path.resolve(root, 'plugins', name),
            fs,
            http,
            url,
            since: START_DATE,
            singleBranch: true,
            remote: 'origin',
        }));
    }

    await Promise.all(promises);
};

type CommitState = {
    date: Date,
    dashboards: string,
    plugins: Record<string, string>,
};

const getPluginLogs = async (root: string) => {
    const logs: Record<string, ReadCommitResult[]> = {};
    for (const plugin of REPO_NAMES) {
        console.log(`Grabbing logs of ${plugin}`);

        const l = await log({
            fs,
            dir: path.resolve(root, 'plugins', plugin),
            force: true,
            follow: true,
        });

        l.sort((a, b) => {
            return a.commit.committer.timestamp - b.commit.committer.timestamp;
        })

        logs[plugin] = l;
    }

    return logs;
};

const grabLogs = async (root: string): Promise<CommitState[]> => {
    console.log('Grabbing logs of Dashboards')
    const dashboardsLogs = await log({
        fs,
        dir: root,
        force: true,
        follow: true,
    });

    dashboardsLogs.sort((a, b) => {
        return a.commit.committer.timestamp - b.commit.committer.timestamp;
    });

    const logs = await getPluginLogs(root);

    const result: CommitState[] = [];

    for (const date of DATE_RANGE) {
        let i = 1;
        while (i < dashboardsLogs.length && new Date(dashboardsLogs[i].commit.committer.timestamp * 1000) < date) {
            i++;
        }

        const l = dashboardsLogs[i - 1];
        const dashboardRef = l.oid;
        const pluginRefs: Record<string, string> = {};

        for (const [name, results] of Object.entries(logs)) {
            i = 1;
            while (i < results.length && new Date(results[i].commit.committer.timestamp * 1000) < date) {
                i++;
            }

            pluginRefs[name] = results[i - 1].oid;
        }

        result.push({
            date,
            dashboards: dashboardRef,
            plugins: pluginRefs,
        });
    }

    return result;
};

const processBackfill = async (root: string, states: CommitState[]) => {
    const len = states.length;
    let i = 1;
    for (const state of states) {
        try {
            console.log(`Iteration ${i}/${len} (${state.date.getUTCMonth() + 1}/${state.date.getDate()}/${state.date.getFullYear()} - ${state.date.toISOString()})`);

            await deleteOld(state.date);
            await grabState(root, state);

            console.log('Getting file info');
            const scssFiles = await getScssFiles(root);
            const contents = await getFileContents(scssFiles);
            const processed = await processFiles(contents);

            const promises: Array<Promise<void>> = [];

            console.log('Processing declarations');
            for (const p of processed) {
                p.root.walkDecls(decl => {
                    promises.push(processDeclaration(root, decl, state.date, false));
                });
            }

            await Promise.all(promises);
        } catch (e) {
            console.error(`Unable to process for ${state.date.getUTCMonth() + 1}/${state.date.getDate()}/${state.date.getFullYear()}`);
            console.error(e);
        }

        i++;
    }
};

const grabState = async (root: string, state: CommitState) => {
    console.log('Checking out');

    await checkout({
        fs,
        dir: root,
        ref: state.dashboards,
        remote: 'origin',
        force: true,
    });

    for (const [name, commit] of Object.entries(state.plugins)) {
        await checkout({
            fs,
            dir: path.resolve(root, 'plugins', name),
            ref: commit,
            remote: 'origin',
            force: true,
        });
    }
};

function generateRange(): Date[] {
    let current = new Date(START_DATE);
    const endTime = END_DATE.getTime();
    const result = [];

    while (current.getTime() <= endTime) {
        result.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return result;
}

run().catch(console.error);
