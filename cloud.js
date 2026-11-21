import { cloudConfig } from './cloud-config.js';

const root = () => cloudConfig.url.replace(/\/+$/, '');
const apiHeaders = (token, extra = {}) => ({
  apikey: cloudConfig.publicKey,
  Authorization: `Bearer ${token || cloudConfig.publicKey}`,
  ...extra
});

async function checked(response) {
  const body = await response.text();
  if (!response.ok) {
    let message = body;
    try { message = JSON.parse(body).message || JSON.parse(body).msg || body; } catch {}
    throw new Error(message || `Cloud request failed (${response.status}).`);
  }
  return body ? JSON.parse(body) : null;
}

export async function cloudLogin(email, password) {
  return checked(await fetch(`${root()}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: apiHeaders(cloudConfig.publicKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, password })
  }));
}

export async function cloudRefresh(refreshToken) {
  return checked(await fetch(`${root()}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: apiHeaders(cloudConfig.publicKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ refresh_token: refreshToken })
  }));
}

export async function cloudRead() {
  const url = `${root()}/rest/v1/${cloudConfig.table}?id=eq.${encodeURIComponent(cloudConfig.rowId)}&select=products,site_images,site_contact`;
  const rows = await checked(await fetch(url, { headers: apiHeaders() }));
  return rows?.[0] || null;
}

export async function cloudWrite(token, content) {
  const url = `${root()}/rest/v1/${cloudConfig.table}?on_conflict=id`;
  return checked(await fetch(url, {
    method: 'POST',
    headers: apiHeaders(token, { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify({ id: cloudConfig.rowId, ...content, updated_at: new Date().toISOString() })
  }));
}

export async function cloudUpload(token, imageData, folder = 'products') {
  const blob = await (await fetch(imageData)).blob();
  const filename = `${crypto.randomUUID()}.jpg`;
  const path = `${folder}/${filename}`;
  const url = `${root()}/storage/v1/object/${cloudConfig.bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
  await checked(await fetch(url, {
    method: 'POST',
    headers: apiHeaders(token, { 'Content-Type': 'image/jpeg', 'x-upsert': 'false' }),
    body: blob
  }));
  return `${root()}/storage/v1/object/public/${cloudConfig.bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
