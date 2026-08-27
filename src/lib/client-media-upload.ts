'use client';

type DirectUploadKind = 'ad-reference' | 'reel';

type MediaStorageCapabilities = {
  provider: 'r2' | 'local';
  configured: boolean;
  directUpload: boolean;
};

let capabilitiesPromise: Promise<MediaStorageCapabilities> | undefined;

async function mediaStorageCapabilities(): Promise<MediaStorageCapabilities> {
  capabilitiesPromise ??= fetch('/api/media-storage/capabilities', {
    cache: 'no-store',
  })
    .then(async (response) => {
      const body = (await response
        .json()
        .catch(() => ({}))) as Partial<MediaStorageCapabilities>;
      if (
        !response.ok ||
        (body.provider !== 'r2' && body.provider !== 'local')
      ) {
        throw new Error('media_storage_capabilities_failed');
      }
      return {
        provider: body.provider,
        configured: body.configured === true,
        directUpload: body.directUpload === true,
      };
    })
    .catch((error) => {
      capabilitiesPromise = undefined;
      throw error;
    });
  return capabilitiesPromise;
}

// On Cloudflare (R2), direct client upload is not supported — callers use the
// server-side R2 upload API route instead. This function always returns an
// empty string so callers fall back to the R2 upload path.
export async function uploadDirectMediaIfSupported(
  _file: Blob,
  _options: { kind: DirectUploadKind; filename: string },
): Promise<string> {
  await mediaStorageCapabilities();
  return '';
}
