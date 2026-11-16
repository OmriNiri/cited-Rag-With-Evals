// Downloads the source HTML. Uses Node's built-in fetch (no HTTP library needed).

export async function downloadHtml(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status} for ${url}`);
  }
  return response.text();
}
