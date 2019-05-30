import { forEachComment } from 'tsutils/util';
import { Node, CommentRange } from 'typescript';

export function stripComments(ast: Node) {
  let commentRanges: CommentRange[] = [];
  forEachComment(ast, (_, range) => {
    commentRanges.push(range);
  });
  commentRanges.sort((a, b) => b.pos - a.pos);
  let src = ast.getFullText();
  for (const range of commentRanges) {
    src = src.substr(0, range.pos) + src.substr(range.end);
  }
  return src;
}
