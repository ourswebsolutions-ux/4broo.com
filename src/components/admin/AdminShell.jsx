import { logoutAction } from "@/actions/auth";
import { Logo } from "@/components/ui/Logo";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { routes } from "@/config/site";
import { AdminMobileMenu } from "./AdminMobileMenu";
import { AdminNav } from "./AdminNav";

export function AdminShell({ admin, children }) {
  // Only display fields cross the server→client boundary.
  const who = { firstName: admin.firstName, lastName: admin.lastName, email: admin.email };
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Phones / tablets: sticky compact bar with a slide-in menu */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-paper/95 px-4 backdrop-blur sm:px-8 lg:hidden">
        <Logo href={routes.admin} className="h-9 shrink-0" />
        <AdminMobileMenu admin={who} />
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden flex-col border-e border-line bg-paper lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0">
        <div className="flex h-20 items-center px-8">
          <Logo href={routes.admin} className="h-10" />
        </div>
        <AdminNav />
        <div className="mt-auto flex flex-col gap-4 border-t border-line p-8">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">
              {admin.firstName} {admin.lastName}
            </p>
            <p className="truncate text-xs text-mute">{admin.email}</p>
          </div>
          <form action={logoutAction}>
            <SubmitButton variant="secondary" size="sm" pendingLabel="Signing out">
              Sign out
            </SubmitButton>
          </form>
        </div>
      </aside>

      <main id="main" className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-14 lg:py-14">
        {children}
      </main>
    </div>
  );
}
