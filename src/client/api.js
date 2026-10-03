async function json(path, options) {
  const res = await fetch(path, options);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `${path} returned ${res.status}`);
  return body;
}

export function fetchConfig() {
  return json('/api/config');
}
