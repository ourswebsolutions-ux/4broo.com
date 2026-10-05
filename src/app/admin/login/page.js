import { redirect } from "next/navigation";
import { adminLoginAction } from "@/actions/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/ui/Logo";
import { routes } from "@/config/site";
import { isAdmin } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  if (isAdmin(await getCurrentUser())) redirect(routes.admin);

  return (
    <main id="main" className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md animate-reveal border border-line bg-paper p-8 sm:p-12">
        <div className="mb-10 flex flex-col items-start gap-6">
          <Logo className="h-14" />
          <div className="flex flex-col gap-2">
            <p className="eyebrow text-mute">Administration</p>
            <h1 className="font-display text-4xl font-light">Staff sign in</h1>
          </div>
        </div>
        <LoginForm action={adminLoginAction} />
      </div>
    </main>
  );
}
