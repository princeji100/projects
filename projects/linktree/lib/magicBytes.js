// Detects image type from the buffer's leading bytes. The client's declared
// Content-Type is deliberately not a parameter — there is nothing to spoof (D-14).
// No dependency added — sniffing a handful of signatures does not need a package.

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const matches = (buffer, offset, bytes) =>
  bytes.every((byte, i) => buffer[offset + i] === byte);

const isAscii = (buffer, offset, text) =>
  matches(buffer, offset, [...text].map((c) => c.charCodeAt(0)));

/**
 * @param {Buffer} buffer
 * @returns {{mime: string, ext: string}|null} null when nothing matches
 */
export function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  if (matches(buffer, 0, [0xff, 0xd8, 0xff])) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // Full 8-byte signature, not the 4-byte short form.
  if (matches(buffer, 0, PNG_SIGNATURE)) {
    return { mime: 'image/png', ext: 'png' };
  }

  // Both halves required — "RIFF" alone is also WAV and AVI.
  if (isAscii(buffer, 0, 'RIFF') && isAscii(buffer, 8, 'WEBP')) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  // SVG falls through: objects are stored public-read, so an SVG carrying
  // <script> would be stored XSS (D-13). GIF falls through too.
  return null;
}
