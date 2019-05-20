import { tsquery } from '@phenomnomnominal/tsquery';
import { FunctionDeclaration } from 'typescript';
import { renameArgs } from './rename-args';
import { renameIdentifiers } from './rename-identifiers';
import { spaceTokens } from './space-tokens';

export interface IInputRecord {
  id: string;
  paths: string[];
  line: string;
  character: string;
  text: string;
}

export interface IFunction {
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

const MAX_SIGNATURE_LENGTH = 100;
const MAX_BODY_LENGTH = 100;

const START_SYMBOL = 'START';
const END_SYMBOL = 'END';

function cleanBody(body: string) {
  // remove newlines
  // convert multiple consecutive spaces into one
  return body.replace(/\r?\n|\r/g, ' ').replace(/\s\s+/g, ' ');
}

function addSymbols(data: string) {
  return `${START_SYMBOL} ${data} ${END_SYMBOL}`;
}

export function prepareFunction(parsedRecord: IInputRecord): IFunction | null {
  const ast = tsquery.ast(parsedRecord.text);
  const fnNode = tsquery.query<FunctionDeclaration>(ast, 'FunctionDeclaration')[0];

  if (!fnNode.body || !fnNode.body.statements.length) {
    // Empty function
    return null;
  }

  if (fnNode.body.getWidth() > MAX_BODY_LENGTH) {
    // removing very long functions
    return null;
  }

  const originalProlog = parsedRecord.text.substr(0, fnNode.body!.getStart()).trim();

  if (originalProlog.length > MAX_SIGNATURE_LENGTH) {
    // remove very long function signatures
    return null;
  }

  const { result, identifiers } = renameIdentifiers(tsquery.ast(renameArgs(ast)));
  const cleanAst = tsquery.ast(spaceTokens(tsquery.ast(result)));
  const cleanFnNode = tsquery.query<FunctionDeclaration>(cleanAst, 'FunctionDeclaration')[0];
  const prolog = cleanAst
    .getFullText()
    .substr(0, cleanFnNode.body!.getStart())
    .trim();

  const name = fnNode.name ? fnNode.name.text : ''; // empty = default function
  const args = fnNode.parameters;
  const originalBody = addSymbols(cleanBody(fnNode.body!.getText()));
  const body = addSymbols(cleanBody(cleanFnNode.body!.getText()));

  return {
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
}
