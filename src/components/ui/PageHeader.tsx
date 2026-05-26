import Link from "next/link";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({ title, backHref, backLabel = "返回" }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      {backHref ? (
        <Link href={backHref} className="text-slate-400 hover:text-slate-600 text-sm">
          ← {backLabel}
        </Link>
      ) : (
        <div className="w-8" />
      )}
      <h1 className="font-medium text-slate-700">{title}</h1>
      <div className="w-8" />
    </div>
  );
}
