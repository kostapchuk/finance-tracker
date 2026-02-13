export function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-1 animate-pulse">
      <div className="h-10 bg-secondary/50 rounded-xl mx-1" />
      <div className="bg-secondary/50 rounded-xl p-2">
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-4 w-4 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="bg-secondary/50 rounded-xl p-2">
        <div className="flex items-center justify-between px-1 py-2">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-8 w-8 bg-muted rounded-lg" />
        </div>
        <div className="flex gap-2 mt-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 w-20 bg-muted/50 rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
      <div className="bg-secondary/50 rounded-xl p-2">
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-4 w-4 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
