const prefix = /^data:image\/(webp|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/;
// The account thumbnail also travels in the session cookie.
export const maxAvatarBytes = 900;

export function isAvatar(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 1240) return false;
  const match = prefix.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  const bytes = atob(match[2]);
  if (bytes.length > maxAvatarBytes) return false;
  return match[1] === 'webp' ? bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP' : bytes.startsWith('\xff\xd8\xff');
}

// Only called with output from our opaque sRGB canvas. Browser encoders can
// attach a display profile larger than the thumbnail itself.
function compactCanvasImage(canvas: HTMLCanvasElement, type: 'webp' | 'jpeg', quality: number) {
  const mime = 'image/' + type;
  const uri = canvas.toDataURL(mime, quality);
  if (!uri.startsWith('data:' + mime + ';base64,')) return null;
  const bytes = atob(uri.slice(uri.indexOf(',') + 1));
  if (bytes.length <= maxAvatarBytes) return uri;
  let image: string;
  if (type === 'webp') {
    // An opaque still only needs the VP8 or VP8L image chunk inside RIFF.
    for (let pos = 12; pos + 8 <= bytes.length;) {
      const tag = bytes.slice(pos, pos + 4);
      const size = bytes.charCodeAt(pos + 4) + bytes.charCodeAt(pos + 5) * 256
        + bytes.charCodeAt(pos + 6) * 65536 + bytes.charCodeAt(pos + 7) * 16777216;
      const end = pos + 8 + size + size % 2;
      if (end > bytes.length) return null;
      if (tag === 'VP8 ' || tag === 'VP8L') {
        const riffSize = end - pos + 4;
        if (riffSize + 8 > maxAvatarBytes) return null;
        image = 'RIFF' + String.fromCharCode(riffSize & 255, riffSize >> 8, 0, 0) + 'WEBP' + bytes.slice(pos, end);
        return 'data:image/webp;base64,' + btoa(image);
      }
      pos = end;
    }
    return null;
  }
  // Preserve JPEG tables and scan data, omitting EXIF and ICC segments.
  const parts = [bytes.slice(0, 2)];
  let pos = 2;
  while (pos + 4 <= bytes.length && bytes.charCodeAt(pos) === 255) {
    const marker = bytes.charCodeAt(pos + 1);
    if (marker === 0xda) break;
    const length = bytes.charCodeAt(pos + 2) * 256 + bytes.charCodeAt(pos + 3);
    const end = pos + 2 + length;
    if (length < 2 || end > bytes.length) return null;
    if (marker !== 0xe1 && marker !== 0xe2) parts.push(bytes.slice(pos, end));
    pos = end;
  }
  parts.push(bytes.slice(pos));
  image = parts.join('');
  return image.length <= maxAvatarBytes ? 'data:image/jpeg;base64,' + btoa(image) : null;
}

export async function prepareAvatar(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw Error('请选择 JPG、PNG 或 WebP 图片。');
  if (file.size > 12 * 1024 * 1024) throw Error('请选择小于 12 MB 的图片。');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch { throw Error('图片无法读取，请换一张。'); }
    const crop = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false, colorSpace: 'srgb' });
    if (!ctx) throw Error('浏览器暂时无法处理图片，请重新打开设置后再试。');
    for (const size of [96, 80, 64, 48, 32, 24, 16, 8]) {
      canvas.width = canvas.height = size;
      ctx.fillStyle = '#f7f6f0';
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, (img.naturalWidth - crop) / 2, (img.naturalHeight - crop) / 2, crop, crop, 0, 0, size, size);
      for (const quality of [.8, .55, .32, .15]) {
        const thumbnail = compactCanvasImage(canvas, 'webp', quality) ?? compactCanvasImage(canvas, 'jpeg', quality);
        if (thumbnail) return thumbnail;
      }
    }
    throw Error('浏览器未能导出头像，请刷新页面后再试。');
  } finally { URL.revokeObjectURL(url); }
}
