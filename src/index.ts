import chalk from 'chalk';
import { appendFileSync, createReadStream, writeFileSync } from 'fs';
import { join } from 'path';
import * as ProgressBar from 'progress';
import { createInterface } from 'readline';
import { createGunzip } from 'zlib';
import { prepareFunction } from './prepare-function';

const NEW_LINE = '\r\n';
const N_OBSERVATIONS = 100;

const progressBar = new ProgressBar('Progress [:bar] :percent | ETA: :etas | :curr/:total', { total: N_OBSERVATIONS });
const input = createReadStream(join(__dirname, '../data/typescript-all-functions.json.gz')).pipe(createGunzip());

const datasetPath = join(__dirname, '../data/dataset.json');
const identifiersPath = join(__dirname, '../data/identifiers.json');
let n_functions = 0;

writeFileSync(datasetPath, '', { encoding: 'utf-8' });

const inputStream = createInterface({ input });
const allIdentifiers = new Set<string>();

console.log(chalk.yellow('Creating dataset. Hold tight!'));

inputStream
  .on('line', (entry) => {
    const parsedRecord = JSON.parse(entry);
    const tsFunction = prepareFunction(parsedRecord);
    if (tsFunction) {
      for (const identifier of tsFunction.identifiers) {
        allIdentifiers.add(identifier);
      }

      appendFileSync(datasetPath, JSON.stringify(tsFunction) + NEW_LINE, { encoding: 'utf-8' });
      writeFileSync(identifiersPath, JSON.stringify(Array.from(allIdentifiers)));

      n_functions++;
      progressBar.tick({ curr: n_functions });

      if (n_functions >= N_OBSERVATIONS) {
        inputStream.close();
      }
    }
  })
  .on('close', () => {
    console.log(chalk.green('Dataset successfully created.'));
    process.exit(0);
  });
