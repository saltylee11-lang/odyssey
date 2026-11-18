import Link from "next/link";

interface PageHeaderProps { title: string; backHref?: string; backLabel?: string; }

export function PageHeader({ title, backHref, backLabel = "返回" }: PageHeaderProps) {
  return <header className="section-heading mb-6"><h1>{title}</h1>
    {backHref && <Link href={backHref}>← {backLabel}</Link>}
  </header>;
}
