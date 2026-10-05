import { NotFoundContent } from "@/components/common/NotFoundContent";

// Storefront 404: rendered inside the storefront layout (header, footer, language).
export default function StorefrontNotFound() {
  return <NotFoundContent embedded />;
}
