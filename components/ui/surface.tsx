export function Surface({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`w-full rounded-2xl bg-content1 p-4 shadow-2xl sm:p-6 ${className}`}>
      {children}
    </div>
  );
}
