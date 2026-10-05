import { cn } from "@/utils/cn";

const TONES = {
  error: "border-danger/30 bg-danger/5 text-danger",
  success: "border-success/30 bg-success/5 text-success",
  neutral: "border-line bg-bone text-ink",
};

export function Alert({ tone = "neutral", children, className }) {
  if (!children) return null;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("border px-4 py-3 text-sm", TONES[tone], className)}>
      {children}
    </div>
  );
}
