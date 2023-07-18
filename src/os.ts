import { Client } from '@opensearch-project/opensearch';
import { ConnectionOptions } from 'node:tls';
import { Declaration } from 'postcss';
import { getSelector, findRoot, isPlugin, isCorePlugin } from './helpers';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { checkEnv } from './helpers';
import 'dotenv/config';

const getSslSettings = (): ConnectionOptions => {
    checkEnv();

    const allowInsecure = Boolean(process.env.OPENSEARCH_ALLOW_INSECURE);

    if (allowInsecure) {
        console.log('Allowing insecure OpenSearch connection');

        return {
            checkServerIdentity: () => {
                return undefined;
            },
        };
    }

    return {};
};

const client = new Client({
    node: process.env.OPENSEARCH_CLIENT_URL,
    ssl: getSslSettings(),
});

export const ensureIndexExists = async (name: string) => {
    const exists = (await client.indices.exists({
        index: name,
    })).body;

    if (exists) {
        return;
    }

    await client.indices.create({
        index: name,
    });
};

export const updateOld = async () => {
    await client.updateByQuery({
        index: 'css',
        body: {
            query: {
                term: {
                    latest: true
                },
            },
            script: {
                source: 'ctx._source.latest = false',
                lang: 'painless',
            },
        },
    });
};

const COLOR_REGEX = /#[a-fA-F0-9]{3}(?:[a-fA-F0-9]{3})?|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\\([^)]*\\)/;

export const processDeclaration = async (root: string, decl: Declaration) => {
    if (!decl.parent || decl.parent.type === 'root') {
        return;
    }

    const selector = getSelector(decl.parent);
    const id = `${selector} ${decl.prop} ${uuidv4()}`;

    const filename = decl.source?.input.file;
    const relativeFilename = filename ? path.relative(root, filename) : undefined;

    await client.index({
        id,
        index: 'css',
        body: {
            prop: decl.prop,
            value: decl.value,
            important: !!decl.important,
            variable: !!decl.variable,
            selector,
            filename: relativeFilename,
            isColor: decl.prop.includes('color') || COLOR_REGEX.test(decl.value),
            root: findRoot(relativeFilename),
            plugin: isPlugin(relativeFilename),
            corePlugin: isCorePlugin(relativeFilename),
            timestamp: new Date().toISOString(),
            latest: true,
        },
    });
};
