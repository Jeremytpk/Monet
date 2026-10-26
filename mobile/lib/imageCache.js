import * as FileSystem from 'expo-file-system';

// Simple image cache: download remote image to FileSystem.cacheDirectory and return local URI
// Usage: const localUri = await cacheImageAsync(remoteUri)
export async function cacheImageAsync(uri) {
  try {
    if (!uri) return null;
    // If already a local file, return as-is
    if (uri.startsWith('file://')) return uri;

    const filename = encodeURIComponent(uri);
    const path = `${FileSystem.cacheDirectory}images/${filename}`;

    // Check if file already exists
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) return path;

    // Ensure directory exists
    await FileSystem.makeDirectoryAsync(`${FileSystem.cacheDirectory}images`, { intermediates: true }).catch(() => {});

    // Download and save
    const tmpPath = `${path}.tmp`;
    const downloadResumable = FileSystem.createDownloadResumable(uri, tmpPath);
    const { uri: downloadedUri } = await downloadResumable.downloadAsync();

    // Move to final path
    await FileSystem.moveAsync({ from: downloadedUri, to: path });
    return path;
  } catch (err) {
    // On any error, return original uri so the image can still load remotely
    console.warn('cacheImageAsync error', err);
    return uri;
  }
}

export async function warmCacheAsync(uris = []) {
  const results = {};
  await Promise.all(uris.map(async (u) => {
    try {
      results[u] = await cacheImageAsync(u);
    } catch (e) {
      results[u] = u;
    }
  }));
  return results;
}
