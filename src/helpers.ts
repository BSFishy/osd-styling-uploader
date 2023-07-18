import { Document, Container, AtRule, Rule } from 'postcss';

export const checkEnv = () => {
    const variablesToCheck = ['OPENSEARCH_CLIENT_URL', 'DEFAULT_PATH'];
    const issues = [];

    for (const variable of variablesToCheck) {
        if (typeof process.env[variable] === 'undefined') {
            issues.push(variable);
        }
    }

    if (issues.length > 0) {
        throw new Error(`Unable to find environment variable(s). Make sure to set up your .env file: ${issues.join(', ')}`);
    }
};

export const getSelector = (node: Document | Container | undefined): string => {
    if (!node) {
        return '';
    }

    if (node.type === 'atrule') {
        const rule = node as AtRule;

        const name = rule.name;
        const params = rule.params;

        const parentSelector = getSelector(rule.parent);
        const parentSelectorText = parentSelector.length > 0 ? `${parentSelector} ` : '';

        return `${parentSelectorText} @${name} ${params}`;
    }

    if (node.type !== 'rule') {
        return getSelector(node.parent);
    }

    const rule = node as Rule;

    const parentSelector = getSelector(rule.parent);
    const parentSelectorText = parentSelector.length > 0 ? `${parentSelector} ` : '';

    return parentSelectorText + rule.selector.replace(/[\n\r\t]+/g, '').replace(/ {2,}/g, ' ').trim();
};

export const findRoot = (filename: string | undefined): string | undefined => {
    if (!filename) {
        return undefined;
    }

    const split = filename.split('/');
    if (split[0] === 'plugins') {
        return split[1];
    }

    if (split[0] === 'packages') {
        return split[1];
    }

    if (split[0] === 'src') {
        if (split[1] === 'plugins') {
            return split[2];
        }

        return split[1];
    }

    return split[0];
};

export const isPlugin = (filename: string | undefined): boolean => {
    if (!filename) {
        return false;
    }

    const split = filename.split('/');
    return split[0] === 'plugins' || (split[0] === 'src' && split[1] === 'plugins');
};

export const isCorePlugin = (filename: string | undefined): boolean => {
    if (!filename) {
        return false;
    }

    const split = filename.split('/');
    return split[0] === 'src' && split[1] === 'plugins';
};
