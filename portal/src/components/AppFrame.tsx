import { Link, Outlet } from "react-router-dom";
import { hasRole, useSession } from "@home/auth";
import MuffledLogo from "@/components/MuffledLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

export default function AppFrame() {
  const { user, logout } = useSession();

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <MuffledLogo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/me">profile</Link>
            </Button>
            {hasRole(user, "admin") && (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/users">users</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/rbac">rbac</Link>
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              sign out
            </Button>
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
