import { cn } from "@/utils/cn";
import { Button } from "./Button";

/**
 * Editorial section header: gold eyebrow, serif title, optional copy and a right-aligned action.
 * @param {{ eyebrow?: string, title: string, description?: string, action?: { label: string, href: string }, tone?: "light"|"dark", align?: "left"|"center", as?: "h1"|"h2"|"h3", id?: string, className?: string }} props
 */
export function SectionHeading({ eyebrow, title, description, action, tone = "light", align = "left", as: Heading = "h2", id, className }) {
  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className={cn("flex max-w-2xl flex-col gap-4", align === "center" && "items-center")}>
        {eyebrow ? (
          <p className={cn("eyebrow flex items-center gap-3", dark ? "text-gold" : "text-gold-deep")}>
            <span className="rule-gold" aria-hidden="true" />
            {eyebrow}
          </p>
        ) : null}
        <Heading id={id} className="headline text-display-sm">
          {title}
        </Heading>
        {description ? (
          <p className={cn("max-w-xl text-[0.9375rem] leading-relaxed", dark ? "text-mist" : "text-subtle")}>{description}</p>
        ) : null}
      </div>

      {action ? (
        <Button href={action.href} variant={dark ? "link-light" : "link"} arrow className="shrink-0 self-start md:self-auto">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
