const prefix = /^data:image\/(webp|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/;
// Supabase includes user metadata in session cookies. Keep only a small thumbnail.
export const maxAvatarBytes = 900;

export function isAvatar(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 1240) return false;
  const match = prefix.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  const bytes = atob(match[2]);
  if (bytes.length > maxAvatarBytes) return false;
  return match[1] === 'webp' ? bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP' : bytes.startsWith('\xff\xd8\xff');
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
    for (const size of [96, 80, 64, 48, 32]) {
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) break;
      ctx.fillStyle = '#f7f6f0';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, (img.naturalWidth - crop) / 2, (img.naturalHeight - crop) / 2, crop, crop, 0, 0, size, size);
      for (const quality of [.8, .55, .32]) {
        let data = canvas.toDataURL('image/webp', quality);
        if (!data.startsWith('data:image/webp;')) data = canvas.toDataURL('image/jpeg', quality);
        if (isAvatar(data)) return data;
      }
    }
    throw Error('这张图片无法生成头像，请换一张。');
  } finally { URL.revokeObjectURL(url); }
}
