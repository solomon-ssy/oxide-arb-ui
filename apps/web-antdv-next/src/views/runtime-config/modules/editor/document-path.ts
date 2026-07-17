/** Read a dotted path from a JSON wire document. */
export function getDocumentPath(document: unknown, path: string): unknown {
  let cursor = document;
  for (const segment of path.split('.')) {
    if (!cursor || typeof cursor !== 'object') {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}
