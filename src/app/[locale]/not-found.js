import { NotFoundContent } from "@/components/common/NotFoundContent";

export const metadata = { title: "404", robots: { index: false } };

export default function NotFound() {
  return <NotFoundContent />;
}
