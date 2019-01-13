export interface IEditEntry {
  start: number;
  end: number;
  newText: string;
}

export function applyEdits(src: string, edits: IEditEntry[]) {
  const sortedEdits = edits.slice(0).sort((a, b) => b.start - a.start);
  for (const entry of sortedEdits) {
    src = src.substr(0, entry.start) + entry.newText + src.substr(entry.end);
  }
  return src;
}
