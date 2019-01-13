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

const renameTokens = [
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

export function renameIdentifiers(ast: SourceFile) {
  const blockNode = tsquery.query<FunctionDeclaration>(ast, 'FunctionDeclaration')[0].body!;
  const matches = tsquery.query<Identifier | StringLiteral | NoSubstitutionTemplateLiteral | NumericLiteral>(
    blockNode,
    renameTokens.map(syntaxKindName).join(', '),
  );
  const renameList: IEditEntry[] = [];
  const identifierMap: { [key: string]: number } = {};
  let cnt = 0;
  for (const node of matches) {
    const { text } = node;
    if (isIdentifier(node) && node.text.startsWith('$arg')) {
      continue;
    }
    if (identifierMap[text] == null) {
      identifierMap[text] = cnt++;
    }
    renameList.push({
      start: node.getStart(),
      end: node.getEnd(),
      newText: newName(node, identifierMap[text]),
    });
  }

  return applyEdits(ast.getFullText(), renameList);
}
