import { ensureIndexExists, updateOld, processDeclaration } from './os';
import { getRoot, getScssFiles, getFileContents, processFiles } from './navigate';
import { checkEnv } from './helpers';
import 'dotenv/config';

async function run() {
    checkEnv();

    console.log(`Running at ${new Date().toISOString()}`);

    console.log('Ensuring indices exist');
    await ensureIndexExists('css');

    console.log('Getting file info');
    const root = getRoot(process.argv[2] ?? process.env.DEFAULT_PATH);
    const scssFiles = await getScssFiles(root);
    const contents = await getFileContents(scssFiles);
    const processed = await processFiles(contents);

    console.log('Updating old decls');
    await updateOld();

    const promises: Array<Promise<void>> = [];

    console.log('Processing declarations')
    for (const p of processed) {
        p.root.walkDecls(decl => {
            promises.push(processDeclaration(root, decl));
        });
    }

    await Promise.all(promises);

    console.log('Done!');
}

run().catch(console.error);
