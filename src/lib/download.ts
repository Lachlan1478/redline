export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Safari and Firefox cancel the download if the URL is revoked in the same task.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
