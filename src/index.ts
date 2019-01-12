import { tsquery } from '@phenomnomnominal/tsquery';
import { createReadStream, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { FunctionDeclaration } from 'typescript';
import { createGunzip } from 'zlib';
import { Parser } from 'json2csv';
import chalk from 'chalk';
import * as Ora from 'ora';

interface IInputRecord {
  id: string;
  paths: string[];
  line: string;
  character: string;
  text: string;
}

interface IFunction {
  id: string;
  line: number;
  character: number;
  name: string;
  argCount: number;
  argNames: Array<string>;
  prolog: string;
  body: string;
}

const NEW_LINE = '\r\n';
const START_SYMBOL = 'START';
const END_SYMBOL = 'END';
const N_OBSERVATIONS = 1000;

const spinner = Ora('Creating dataset. Hold tight!');
const input = createReadStream(join(__dirname, '../data/typescript-all-functions.json.gz')).pipe(createGunzip());

const datasetPath = join(__dirname, '../data/dataset.csv');
const csvParser = new Parser({ header: false });
let n_functions = 0;

const fields = ['id', 'line', 'character', 'name', 'argCount', 'argNames', 'prolog', 'body'];
writeFileSync(datasetPath, fields + NEW_LINE, { encoding: 'utf-8' });

const inputStream = createInterface({ input });

spinner.start();

inputStream
  .on('line', (entry) => {
    const parsedRecord = JSON.parse(entry) as IInputRecord;
    const ast = tsquery.ast(parsedRecord.text);
    const fnNode = tsquery.query<FunctionDeclaration>(ast, 'FunctionDeclaration')[0];

    if (!fnNode.body) {
      // empty function?
      return;
    }

    if (fnNode.body.getWidth() > 100) {
      // removing very long functions
      return;
    }

    n_functions++;

    const name = fnNode.name ? fnNode.name.text : ''; // empty = default function
    const args = fnNode.parameters;
    const body = `${START_SYMBOL} ${fnNode.body!.getText()} ${END_SYMBOL}`;

    const tsFunction: IFunction = {
      id: parsedRecord.id,
      line: parseInt(parsedRecord.line, 10),
      character: parseInt(parsedRecord.character, 10),
      name,
      argCount: args.length,
      argNames: args.map((n) => n.name.getText()),
      prolog: parsedRecord.text.substr(0, fnNode.body!.getStart()).trim(),
      body,
    };

    const observation = csvParser.parse(tsFunction) + NEW_LINE;

    appendFileSync(datasetPath, observation, { encoding: 'utf-8' });

    if (n_functions >= N_OBSERVATIONS) {
      inputStream.close();
    }
  })
  .on('close', () => {
    spinner.succeed(chalk.green('Dataset successfully created.'));
    process.exit(0);
  });
