export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface AppUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  latestTag: string;
  hasUpdate: boolean;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  releaseUrl: string;
  downloadUrl?: string;
  assets: ReleaseAsset[];
}

export function parseSemver(v: string): [number, number, number] {
  if (!v) return [0, 0, 0];
  const clean = v.replace(/^v/i, '').split('-')[0]!.trim();
  const parts = clean.split('.').map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function isNewerVersion(latestStr: string, currentStr: string): boolean {
  const [lMajor, lMinor, lPatch] = parseSemver(latestStr);
  const [cMajor, cMinor, cPatch] = parseSemver(currentStr);

  if (lMajor > cMajor) return true;
  if (lMajor < cMajor) return false;
  if (lMinor > cMinor) return true;
  if (lMinor < cMinor) return false;
  return lPatch > cPatch;
}
