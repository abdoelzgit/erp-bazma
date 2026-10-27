export function getPpdAttachmentName(url: string, fallback: string) {
  const queryIndex = url.indexOf("?");
  if (queryIndex < 0) return fallback;
  const name = new URLSearchParams(url.slice(queryIndex + 1)).get("name");
  return name || fallback;
}

export function isPpdAttachmentUrlForPrefix(url: string, prefix: string) {
  if (!url.startsWith(prefix)) return false;
  const reference = url.slice(prefix.length);
  const queryIndex = reference.indexOf("?");
  const fileName = queryIndex < 0 ? reference : reference.slice(0, queryIndex);
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i.test(fileName)) return false;
  if (queryIndex < 0) return true;

  const query = new URLSearchParams(reference.slice(queryIndex + 1));
  return [...query.keys()].length === 1 && query.has("name") && (query.get("name")?.length ?? 0) <= 255;
}
