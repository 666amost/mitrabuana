// Server-only image utilities. Keep any native imports inside functions so the
// bundler doesn't attempt to resolve native modules for client builds.

export type ConvertedImage = { buffer: Buffer; ext: 'webp' | 'jpg'; contentType: 'image/webp' | 'image/jpeg' };

// Try converting to WebP first. If that fails (for example platform issue
// with WebP encoding), fall back to JPEG. If sharp isn't available, throw
// so callers can decide how to handle it.
export async function convertToWebpOrJpeg(input: Buffer | ArrayBufferLike): Promise<ConvertedImage> {
  const buf = Buffer.from(input as any);
  // Load sharp at runtime to avoid bundlers resolving it for client builds.
  let sharp: any;
  try {
    const req: any = Function('return require')();
    sharp = req('sharp');
  } catch (err) {
    throw new Error('sharp-not-installed');
  }

  if (!sharp) throw new Error('sharp-not-installed');

  // Try WebP first
  try {
    const webpBuffer = await sharp(buf).webp({ quality: 80 }).toBuffer();
    return { buffer: webpBuffer, ext: 'webp', contentType: 'image/webp' };
  } catch (webpErr) {
    // If webp conversion fails, try JPEG as a fallback
    try {
      const jpgBuffer = await sharp(buf).jpeg({ quality: 80 }).toBuffer();
      return { buffer: jpgBuffer, ext: 'jpg', contentType: 'image/jpeg' };
    } catch (jpgErr) {
      // If both conversions fail, propagate the original WebP error to surface root cause
      throw webpErr;
    }
  }
}

