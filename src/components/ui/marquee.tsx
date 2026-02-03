import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode;
  direction?: "left" | "right";
  speed?: "slow" | "normal" | "fast";
  pauseOnHover?: boolean;
  className?: string;
}

export function Marquee({
  children,
  direction = "left",
  speed = "normal",
  pauseOnHover = true,
  className,
}: MarqueeProps) {
  const speedClasses = {
    slow: "animate-[marquee_60s_linear_infinite]",
    normal: "animate-[marquee_40s_linear_infinite]",
    fast: "animate-[marquee_20s_linear_infinite]",
  };

  return (
    <div
      className={cn(
        "flex overflow-hidden [--gap:2rem]",
        pauseOnHover && "hover:[&>*]:animate-pause",
        className
      )}
    >
      <div
        className={cn(
          "flex min-w-full shrink-0 items-center justify-around gap-[--gap]",
          speedClasses[speed],
          direction === "right" && "animate-[marquee_40s_linear_infinite_reverse]"
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "flex min-w-full shrink-0 items-center justify-around gap-[--gap]",
          speedClasses[speed],
          direction === "right" && "animate-[marquee_40s_linear_infinite_reverse]"
        )}
      >
        {children}
      </div>
    </div>
  );
}
