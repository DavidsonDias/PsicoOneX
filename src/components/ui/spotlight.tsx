import { useMotionValue, motion, useSpring, useTransform } from "framer-motion";
import { useRef, MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface SpotlightProps {
  children: React.ReactNode;
  className?: string;
}

export function Spotlight({ children, className }: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const springConfig = { damping: 25, stiffness: 150 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  const spotlightX = useTransform(x, (val) => `${val}px`);
  const spotlightY = useTransform(y, (val) => `${val}px`);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cn("relative overflow-hidden", className)}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${spotlightX} ${spotlightY}, hsl(var(--primary) / 0.1), transparent 40%)`,
        }}
      />
      {children}
    </div>
  );
}
