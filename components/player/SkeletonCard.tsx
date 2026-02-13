export const SkeletonCard = () => (
    <div className="w-64 h-96 bg-card/50 rounded-[2rem] animate-pulse">
        <div className="w-full h-full flex flex-col p-4">
            <div className="flex gap-4">
                <div className="flex flex-col gap-2">
                    <div className="w-12 h-12 bg-muted rounded"></div>
                    <div className="w-12 h-6 bg-muted rounded"></div>
                </div>
                <div className="flex-1 bg-muted rounded"></div>
            </div>
            <div className="mt-4 space-y-3">
                <div className="h-6 bg-muted rounded"></div>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-4 bg-muted rounded"></div>
                ))}
            </div>
        </div>
    </div>
);
