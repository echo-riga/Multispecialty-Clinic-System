function getAuthHeaders() {
  const raw = localStorage.getItem('authUser');
  if (!raw) return {};
  const { username, role } = JSON.parse(raw);
  return { 'X-User': username, 'X-Role': role };
}

async function apiGet(path) {
  const res = await fetch(path, { headers: { ...getAuthHeaders() } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(body || {}) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(path, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(body || {}) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
  return res.json();
}

async function apiUpload(path, file, fields) {
  const form = new FormData();
  if (file) form.append('file', file);
  const extras = fields || {};
  for (const [k, v] of Object.entries(extras)) form.append(k, v);
  const res = await fetch(path, { method: 'POST', headers: { ...getAuthHeaders() }, body: form });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed');
  return res.json();
}

async function apiGetBlob(path) {
  const res = await fetch(path, { headers: { ...getAuthHeaders() } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
  return res.blob();
}

async function apiDelete(path) {
  const res = await fetch(path, { method: 'DELETE', headers: { ...getAuthHeaders() } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
  return res.json();
}


