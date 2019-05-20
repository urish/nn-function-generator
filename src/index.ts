import { createReadStream, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { createGunzip } from 'zlib';
import { Parser } from 'json2csv';
import chalk from 'chalk';
import * as ProgressBar from 'progress';
import { prepareFunction, IFunction } from './prepare-function';

const NEW_LINE = '\r\n';
const N_OBSERVATIONS = 100;

const progressBar = new ProgressBar('Progress [:bar] :percent | ETA: :etas | :curr/:total', { total: N_OBSERVATIONS });
const input = createReadStream(join(__dirname, '../data/typescript-all-functions.json.gz')).pipe(createGunzip());

const datasetPath = join(__dirname, '../data/dataset.csv');
const identifiersPath = join(__dirname, '../data/identifiers.json');
const csvParser = new Parser({ header: false });
let n_functions = 0;

type Headers = Array<keyof IFunction>;
const fields: Headers = [
  'id',
  'line',
  'character',
  'name',
  'argCount',
  'argNames',
  'originalProlog',
  'prolog',
  'originalBody',
  'body',
  'identifiers',
];

writeFileSync(datasetPath, fields + NEW_LINE, { encoding: 'utf-8' });

const inputStream = createInterface({ input });
const allIdentifiers = new Set<string>();

console.log(chalk.yellow('Creating dataset. Hold tight!'));

inputStream
  .on('line', (entry) => {
    const parsedRecord = JSON.parse(entry);
    const tsFunction = prepareFunction(parsedRecord);
    if (tsFunction) {
      const observation = csvParser.parse(tsFunction) + NEW_LINE;

      for (const identifier of tsFunction.identifiers) {
        allIdentifiers.add(identifier);
      }

      appendFileSync(datasetPath, observation, { encoding: 'utf-8' });
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
