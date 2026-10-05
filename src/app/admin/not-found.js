import Link from "next/link";

export const metadata = { title: "Not found" };

export default function AdminNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-start justify-center gap-6 bg-bone px-8 py-24 sm:px-16">
      <p className="eyebrow text-mute">Admin · 404</p>
      <h1 className="font-display text-display-sm font-light">This admin page does not exist.</h1>
      <Link href="/admin" className="eyebrow border border-ink px-5 py-3 hover:bg-ink hover:text-paper">
        Back to overview
      </Link>
    </main>
  );
}
