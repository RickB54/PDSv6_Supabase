// Lightweight Google Drive integration (client-side). Requires env vars:
// - VITE_GOOGLE_CLIENT_ID
// - VITE_GOOGLE_API_KEY
// If missing, functions will no-op and UI can fallback to manual upload/download.

type Gapi = any;

function getEnv(key: string): string | undefined {
  try { return (import.meta as any)?.env?.[key]; } catch { return undefined; }
}

const CLIENT_ID = getEnv('VITE_GOOGLE_CLIENT_ID');
const API_KEY = getEnv('VITE_GOOGLE_API_KEY');

let gapiLoaded = false;

async function loadGapi(): Promise<Gapi | null> {
  if (gapiLoaded) return (window as any).gapi || null;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = async () => {
      try {
        const gapi = (window as any).gapi;
        await gapi.load('client:auth2');
        await gapi.client.init({ apiKey: API_KEY, clientId: CLIENT_ID, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'], scope: 'https://www.googleapis.com/auth/drive.file' });
        gapiLoaded = true;
        resolve(gapi);
      } catch {
        resolve(null);
      }
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

export async function isDriveEnabled(): Promise<boolean> {
  const mode = (import.meta.env.VITE_AUTH_MODE || 'local').toLowerCase();
  if (mode === 'local') return false;
  return Boolean(CLIENT_ID && API_KEY && (await loadGapi()));
}

export async function ensureDriveSignIn(): Promise<boolean> {
  const gapi = await loadGapi();
  if (!gapi) return false;
  try {
    const auth = gapi.auth2.getAuthInstance();
    if (!auth.isSignedIn.get()) {
      await auth.signIn();
    }
    return true;
  } catch { return false; }
}

export async function uploadJSONToDrive(fileName: string, content: string): Promise<string | null> {
  const gapi = await loadGapi();
  if (!gapi) return null;
  const ok = await ensureDriveSignIn();
  if (!ok) return null;
  try {
    const file = new Blob([content], { type: 'application/json' });
    const metadata = { name: fileName, mimeType: 'application/json' } as any;
    const accessToken = gapi.auth.getToken().access_token;

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    const data = await res.json();
    return data?.id || null;
  } catch { return null; }
}

export async function pickDriveFileAndDownload(): Promise<{ name: string; content: string } | null> {
  const gapi = await loadGapi();
  if (!gapi) return null;
  const ok = await ensureDriveSignIn();
  if (!ok) return null;
  try {
    const res = await gapi.client.drive.files.list({ pageSize: 25, fields: 'files(id,name,mimeType)', q: "mimeType='application/json'" });
    const files = res?.result?.files || [];
    if (!files.length) return null;
    const f = files[0]; // simple: pick first; UI can be enhanced later
    const accessToken = gapi.auth.getToken().access_token;
    const dl = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const text = await dl.text();
    return { name: f.name, content: text };
  } catch { return null; }
}

