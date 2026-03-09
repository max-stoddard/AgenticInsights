interface SkeletonBlockProps {
  className: string;
}

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={`animate-pulse rounded-[20px] border border-stone-200 bg-white ${className}`} />;
}
