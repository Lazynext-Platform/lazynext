export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-fg-muted/20 rounded" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-fg-muted/20 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-fg-muted/20 rounded-lg" />
      </div>
    </div>
  );
}
