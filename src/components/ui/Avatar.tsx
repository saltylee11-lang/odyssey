import Image from 'next/image';

export function Avatar({ photo, name }: { photo: string | null; name: string }) {
  return <span className="profile-avatar" aria-hidden="true">{photo
    ? <Image src={photo} alt="" unoptimized width={96} height={96} />
    : Array.from(name.trim())[0] || '舟'}</span>;
}
