import { tsquery } from '@phenomnomnominal/tsquery';
import { createReadStream, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { FunctionDeclaration } from 'typescript';
import { createGunzip } from 'zlib';
import { Parser } from 'json2csv';
import chalk from 'chalk';
import { renameArgs } from './rename-args';
import { renameIdentifiers } from './rename-identifiers';
import { spaceTokens } from './space-tokens';
import * as ProgressBar from 'progress';

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
  originalProlog: string;
  originalBody: string;
  body: string;
  identifiers: Array<string>;
}

type Headers = Array<keyof IFunction>;

const NEW_LINE = '\r\n';
const START_SYMBOL = 'START';
const END_SYMBOL = 'END';
const N_OBSERVATIONS = 1000;
const MAX_SIGNATURE_LENGTH = 100;
const MAX_BODY_LENGTH = 100;

function cleanBody(body: string) {
  // remove newlines
  // convert multiple consecutive spaces into one
  return body.replace(/\r?\n|\r/g, ' ').replace(/\s\s+/g, ' ');
}

function addSymbols(data: string) {
  return `${START_SYMBOL} ${data} ${END_SYMBOL}`;
}

const progressBar = new ProgressBar('Progress [:bar] :percent | ETA: :etas | :curr/:total', { total: N_OBSERVATIONS });
const input = createReadStream(join(__dirname, '../data/typescript-all-functions.json.gz')).pipe(createGunzip());

const datasetPath = join(__dirname, '../data/dataset.csv');
const identifiersPath = join(__dirname, '../data/identifiers.json');
const csvParser = new Parser({ header: false });
let n_functions = 0;

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
  'identifiers'
];

writeFileSync(datasetPath, fields + NEW_LINE, { encoding: 'utf-8' });

const inputStream = createInterface({ input });
const allIdentifiers = new Set<string>();

console.log(chalk.yellow('Creating dataset. Hold tight!'));

inputStream
  .on('line', (entry) => {
    const parsedRecord = JSON.parse(entry) as IInputRecord;
    const ast = tsquery.ast(parsedRecord.text);
    const fnNode = tsquery.query<FunctionDeclaration>(ast, 'FunctionDeclaration')[0];

    if (!fnNode.body || !fnNode.body.statements.length) {
      // Empty function
      return;
    }

    if (fnNode.body.getWidth() > MAX_BODY_LENGTH) {
      // removing very long functions
      return;
    }

    const originalProlog = parsedRecord.text.substr(0, fnNode.body!.getStart()).trim();

    if (originalProlog.length > MAX_SIGNATURE_LENGTH) {
      // remove very long function signatures
      return;
    }

    const { result, identifiers } = renameIdentifiers(tsquery.ast(renameArgs(ast)));
    const cleanAst = tsquery.ast(spaceTokens(tsquery.ast(result)));
    const cleanFnNode = tsquery.query<FunctionDeclaration>(cleanAst, 'FunctionDeclaration')[0];
    const prolog = cleanAst
      .getFullText()
      .substr(0, cleanFnNode.body!.getStart())
      .trim();

    n_functions++;

    const name = fnNode.name ? fnNode.name.text : ''; // empty = default function
    const args = fnNode.parameters;
    const originalBody = addSymbols(cleanBody(fnNode.body!.getText()));
    const body = addSymbols(cleanBody(cleanFnNode.body!.getText()));

    const tsFunction: IFunction = {
      id: parsedRecord.id,
      line: parseInt(parsedRecord.line, 10),
      character: parseInt(parsedRecord.character, 10),
      name,
      argCount: args.length,
      argNames: args.map((n) => n.name.getText()),
      originalProlog,
      prolog,
      originalBody,
      body,
      identifiers,
    };

    const observation = csvParser.parse(tsFunction) + NEW_LINE;

    for (const identifier of identifiers) {
      allIdentifiers.add(identifier);
    }

    appendFileSync(datasetPath, observation, { encoding: 'utf-8' });
    writeFileSync(identifiersPath, JSON.stringify(Array.from(allIdentifiers)));

    progressBar.tick({ curr: n_functions });

    if (n_functions >= N_OBSERVATIONS) {
      inputStream.close();
    }
  })
  .on('close', () => {
    console.log(chalk.green('Dataset successfully created.'));
    process.exit(0);
  });
