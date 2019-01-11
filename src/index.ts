import { tsquery } from '@phenomnomnominal/tsquery';
import { createReadStream } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { FunctionDeclaration } from 'typescript';
import { createGunzip } from 'zlib';

interface IInputRecord {
  id: string;
  paths: string[];
  line: string;
  character: string;
  text: string;
}

function trimBody(body: string) {
  // Remove beginning/final curly braces
  return body.substr(1, body.length - 1).trim();
}

const input = createReadStream(join(__dirname, '../data/typescript-all-functions.json.gz')).pipe(createGunzip());
createInterface({ input }).on('line', (entry) => {
  const parsedRecord = JSON.parse(entry) as IInputRecord;
  const ast = tsquery.ast(parsedRecord.text);
  const fnNode = tsquery.query<FunctionDeclaration>(ast, 'FunctionDeclaration')[0];
  if (!fnNode.body) {
    // empty function?
    return;
  }
  const name = fnNode.name ? fnNode.name.text : ''; // empty = default function
  const args = fnNode.parameters;
  const body = trimBody(fnNode.body!.getText());
  console.log({
    id: parsedRecord.id,
    line: parseInt(parsedRecord.line, 10),
    character: parseInt(parsedRecord.character, 10),
    name,
    argCount: args.length,
    argNames: args.map((n) => n.name.getText()),
    prolog: parsedRecord.text.substr(0, fnNode.body!.getStart()).trim(),
    body,
  });
});
