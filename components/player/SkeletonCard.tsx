export const SkeletonCard = () => (
    <div className="relative w-full max-w-[17rem] sm:max-w-64 mx-auto aspect-[2/3] bg-card/50 rounded-t-[2rem] rounded-b-xl animate-pulse">
        <div className="w-full h-full flex flex-col p-3 sm:p-4">
            <div className="flex gap-3 sm:gap-4 h-1/2">
                <div className="flex flex-col gap-2 w-1/4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded" />
                    <div className="w-10 h-5 sm:w-12 sm:h-6 bg-muted rounded" />
                </div>
                <div className="flex-1 bg-muted rounded-xl" />
            </div>
            <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 flex-1">
                <div className="h-5 sm:h-6 bg-muted rounded mx-auto w-3/4" />
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-3 sm:h-4 bg-muted rounded" />
                ))}
            </div>
        </div>
    </div>
);
