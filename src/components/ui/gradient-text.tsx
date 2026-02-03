import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface GradientTextProps extends HTMLMotionProps<"span"> {
  animate?: boolean;
}

export function GradientText({
  className,
  animate = false,
  children,
  ...props
}: GradientTextProps) {
  return (
    <motion.span
      className={cn(
        "bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent",
        animate && "bg-[length:200%_auto] animate-gradient",
        className
      )}
      {...props}
    >
      {children}
    </motion.span>
  );
}
