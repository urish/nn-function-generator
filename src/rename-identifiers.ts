import {
  SyntaxKind,
  Node,
  SourceFile,
  Identifier,
  StringLiteral,
  NoSubstitutionTemplateLiteral,
  NumericLiteral,
  FunctionDeclaration,
  isIdentifier,
} from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { IEditEntry, applyEdits } from './rename-utils';
import { syntaxKindName } from '@phenomnomnominal/tsquery/dist/src/syntax-kind';

export type IdentifierType = 'string' | 'identifier' | 'number';

export const renameTokens = [
  SyntaxKind.Identifier,
  SyntaxKind.StringLiteral,
  SyntaxKind.NumericLiteral,
  SyntaxKind.NoSubstitutionTemplateLiteral,
];

function newName(node: Node, id: number) {
  switch (node.kind) {
    case SyntaxKind.Identifier:
      return 'id' + id;
    case SyntaxKind.StringLiteral:
      return `'${id}'`;
    case SyntaxKind.NoSubstitutionTemplateLiteral:
      return `\`${id}\``;
    case SyntaxKind.NumericLiteral:
      return id.toString();
    default:
      throw new Error('Unexpected node type: ' + syntaxKindName(node.kind));
  }
}

function getType(node: Node, prevType?: IdentifierType | null): IdentifierType {
  switch (node.kind) {
    case SyntaxKind.Identifier:
      return 'identifier';
    case SyntaxKind.StringLiteral:
    case SyntaxKind.NoSubstitutionTemplateLiteral:
      return prevType || 'string';
    case SyntaxKind.NumericLiteral:
      return 'number';
  }
  throw new Error('Unexpected node type: ' + syntaxKindName(node.kind));
}

export function renameIdentifiers(ast: SourceFile) {
  const blockNode = tsquery.query<FunctionDeclaration>(ast, 'FunctionDeclaration')[0].body!;
  const matches = tsquery.query<Identifier | StringLiteral | NoSubstitutionTemplateLiteral | NumericLiteral>(
    blockNode,
    renameTokens.map(syntaxKindName).join(', '),
  );
  const renameList: IEditEntry[] = [];
  const identifierMap: { [key: string]: number } = {};
  const identifierTypes: { [key: string]: IdentifierType } = {};
  let cnt = 0;
  for (const node of matches) {
    const { text } = node;
    if (isIdentifier(node) && node.text.startsWith('$arg')) {
      continue;
    }
    if (identifierMap[text] == null) {
      identifierMap[text] = cnt++;
    }
    identifierTypes[text] = getType(node, identifierTypes[text]);
    renameList.push({
      start: node.getStart(),
      end: node.getEnd(),
      newText: newName(node, identifierMap[text]),
    });
  }

  const identifiers: string[] = [];
  const types: string[] = [];
  for (const key of Object.keys(identifierMap)) {
    identifiers[identifierMap[key]] = key;
    types[identifierMap[key]] = identifierTypes[key];
  }

  return {
    result: applyEdits(ast.getFullText(), renameList),
    types,
    identifiers,
  };
}
