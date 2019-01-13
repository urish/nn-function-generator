import * as ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { IEditEntry, applyEdits } from './rename-utils';

export function renameIdentifiers(ast: ts.SourceFile) {
  const identifiers = tsquery.query<ts.Identifier>(ast, 'FunctionDeclaration Block Identifier');
  const renameList: IEditEntry[] = [];
  const identifierMap: { [key: string]: number } = {};
  let cnt = 0;
  for (const identifier of identifiers) {
    const { text } = identifier;
    if (text.startsWith('$arg')) {
      continue;
    }
    if (identifierMap[text] == null) {
      identifierMap[text] = cnt++;
    }
    renameList.push({
      start: identifier.getStart(),
      end: identifier.getEnd(),
      newText: `id${identifierMap[text]}`,
    });
  }

  return applyEdits(ast.getFullText(), renameList);
}
