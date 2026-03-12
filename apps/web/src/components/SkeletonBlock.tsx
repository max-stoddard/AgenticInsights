interface SkeletonBlockProps {
  className: string;
}

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={`animate-pulse rounded-xl border border-slate-200/60 bg-slate-100 ${className}`} />;
}
