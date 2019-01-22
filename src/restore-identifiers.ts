import { tsquery } from '@phenomnomnominal/tsquery';
import {
  SourceFile,
  FunctionDeclaration,
  Identifier,
  StringLiteral,
  NoSubstitutionTemplateLiteral,
  NumericLiteral,
  isIdentifier,
  Node,
  isStringLiteral,
  isNoSubstitutionTemplateLiteral,
  isNumericLiteral,
} from 'typescript';
import { IEditEntry, applyEdits } from './rename-utils';
import { renameTokens } from './rename-identifiers';
import { syntaxKindName } from '@phenomnomnominal/tsquery/dist/src/syntax-kind';

function newName(node: Node, identifiers: string[]) {
  if (isIdentifier(node) && node.text.startsWith('id')) {
    return identifiers[parseInt(node.text.substr(2), 10)];
  }
  if (isStringLiteral(node) || isNoSubstitutionTemplateLiteral(node)) {
    const value = identifiers[parseInt(node.text, 10)];
    const quote = node.getText()[0];
    return value != null ? quote + value + quote : null;
  }
  if (isNumericLiteral(node)) {
    return identifiers[parseInt(node.text, 10)];
  }
  return null;
}

export function restoreIdentifiers(ast: SourceFile, identifiers: string[]) {
  const blockNode = tsquery.query<FunctionDeclaration>(ast, 'FunctionDeclaration')[0].body!;
  const matches = tsquery.query<Identifier | StringLiteral | NoSubstitutionTemplateLiteral | NumericLiteral>(
    blockNode,
    renameTokens.map(syntaxKindName).join(', '),
  );
  const renameList: IEditEntry[] = [];
  for (const node of matches) {
    const newValue = newName(node, identifiers);
    if (newValue != null) {
      renameList.push({
        start: node.getStart(),
        end: node.getEnd(),
        newText: newValue,
      });
    }
  }

  return applyEdits(ast.getFullText(), renameList);
}
