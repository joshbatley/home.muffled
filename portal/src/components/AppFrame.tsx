import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@home/auth-ts";

export default function AppFrame({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="font-semibold text-gray-900">home.muffled portal</span>
          <div className="flex items-center gap-4">
            <Link to="/me" className="text-sm text-gray-500 hover:text-gray-900">
              Profile
            </Link>
            {user?.roles.includes("admin") && (
              <>
                <Link to="/users" className="text-sm text-gray-500 hover:text-gray-900">
                  Users
                </Link>
                <Link to="/rbac" className="text-sm text-gray-500 hover:text-gray-900">
                  RBAC
                </Link>
              </>
            )}
            <button
              onClick={() => void logout()}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>
      {children ?? <Outlet />}
    </div>
  );
}
