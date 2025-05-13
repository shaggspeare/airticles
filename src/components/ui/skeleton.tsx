import React from "react";
import { cn } from "@/lib/utils"; // Make sure this utility exists in your project

function Skeleton({
                      className,
                      ...props
                  }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-zinc-700/50", className)}
            {...props}
        />
    )
}

export { Skeleton }