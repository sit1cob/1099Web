const TECHMATE_BASE_URL = import.meta.env.VITE_TECHMATE_BASE_URL as string;
const TECHMATE_EMBED_CLIENT_KEY = import.meta.env.VITE_TECHMATE_EMBED_CLIENT_KEY as string;

export async function createTechmateIframeUrl(user: {
  username: string;
  app1099LoginToken: string;
}) {
  const response = await fetch(`${TECHMATE_BASE_URL}/api/embed-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Embed-Client-Key': TECHMATE_EMBED_CLIENT_KEY,
      Authorization: `Bearer ${user.app1099LoginToken}`,
    },
    body: JSON.stringify({ username: user.username }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Unable to create Techmate iframe session');
  }

  return result.iframeUrl as string;
}
