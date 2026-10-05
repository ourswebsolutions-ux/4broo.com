import { cn } from "@/utils/cn";

const SIZES = {
  page: "container-page",
  narrow: "container-narrow",
};

/** Responsive horizontal container with the shared fluid gutter. */
export function Container({ as: Component = "div", size = "page", className, children, ...props }) {
  return (
    <Component className={cn(SIZES[size], className)} {...props}>
      {children}
    </Component>
  );
}
