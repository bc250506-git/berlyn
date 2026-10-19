import sharp from 'sharp';

/**
 * Universal Image Converter
 * Converts any image format (especially iPhone HEIC/HEIF, JPEG, PNG) to an optimized WebP buffer.
 * Solves the pre-built sharp libvips "bad seek" / HEVC codec patent error on Windows/Linux by
 * using heic-convert (libde265) before sharp optimization.
 */
export async function convertImageToWebP(
  inputBuffer: Buffer,
  fileName: string = '',
  maxWidth: number = 1920,
  flipHorizontal: boolean = false
): Promise<Buffer> {
  let processBuffer: Buffer = inputBuffer;

  const nameLower = fileName.toLowerCase();
  const isHeic =
    nameLower.endsWith('.heic') ||
    nameLower.endsWith('.heif') ||
    (inputBuffer.length > 12 && inputBuffer.toString('ascii', 4, 8) === 'ftyp');

  if (isHeic) {
    try {
      // Use heic-convert to decode iPhone HEIC container to JPEG
      const heicConvert = require('heic-convert');
      const jpegArrayBuffer = await heicConvert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 0.92,
      });
      processBuffer = Buffer.from(jpegArrayBuffer);
    } catch (err) {
      console.warn('heic-convert decoding encountered an issue, falling back directly to sharp:', err);
    }
  }

  let pipeline = sharp(processBuffer, { failOn: 'none', limitInputPixels: false })
    .rotate(); // auto-orient based on iPhone EXIF orientation tag

  if (flipHorizontal) {
    pipeline = pipeline.flop(); // mirror horizontally when requested
  }

  // Convert to WebP using sharp with failOn: 'none' to ignore any minor EXIF/tile warnings
  return await pipeline
    .resize({ width: maxWidth, height: maxWidth, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, effort: 4 })
    .toBuffer();
}
