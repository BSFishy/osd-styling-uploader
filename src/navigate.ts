import fs from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import postcssScss from 'postcss-scss';

export const getRoot = (dir: string): string => {
    if (path.isAbsolute(dir)) {
        return dir;
    }

    return path.join(process.cwd(), dir);
};

export const getScssFiles = async (dir: string): Promise<string[]> => {
    const queue = [dir];
    const files = [];

    while (queue.length > 0) {
        const dirname = queue.shift()!;
        const readdir = await fs.readdir(dirname);

        for (const filename of readdir) {
            const filepath = path.join(dirname, filename);
            if (filepath.endsWith('node_modules')) {
                continue;
            }

            const stat = await fs.lstat(filepath);

            if (stat.isFile()) {
                if (filepath.endsWith('.scss')) {
                    files.push(filepath);
                }
            } else if (stat.isDirectory()) {
                queue.push(filepath);
            }
        }
    }

    return files;
}

export const getFileContents = async (files: string[]): Promise<Array<[string, string]>> => {
    const contents: Array<[string, string]> = [];
    for (const filename of files) {
        contents.push([filename, await fs.readFile(filename, { encoding: 'utf-8' })]);
    }

    return contents;
};

export const processFiles = async (files: Array<[string, string]>): Promise<postcss.Result[]> => {
    const processed = [];
    const pcss = postcss();
    const options = {
        syntax: postcssScss,
    };

    for (const [filename, fileContents] of files) {
        processed.push(await pcss.process(fileContents, {
            ...options,
            from: filename,
        }));
    }

    return processed;
};
