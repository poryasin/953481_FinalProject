import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bookmark,
  FolderOpen,
  Home,
  LogIn,
  ChefHat,
  LogOut,
  User as UserIcon,
} from "lucide-react";

type User = {
  user_id: number;
  username: string;
  email: string;
  created_at?: string;
};

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  mobile?: boolean;
};

function NavItem({ to, icon, label, active, mobile }: NavItemProps) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        mobile ? "flex-col gap-0.5 px-4 text-xs" : ""
      } ${
        active
          ? "bg-orange-100 text-orange-600"
          : "text-gray-500 hover:text-gray-900"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <ChefHat className="h-7 w-7 text-orange-500" />
          <span className="text-xl font-bold text-gray-900">Recipe</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <NavItem
            icon={<Home className="h-4 w-4" />}
            label="Home"
            active={isActive("/")}
          />
          <NavItem
            to="/bookmarks"
            icon={<Bookmark className="h-4 w-4" />}
            label="Bookmarks"
            active={isActive("/bookmarks")}
          />
          <NavItem
            to="/folders"
            icon={<FolderOpen className="h-4 w-4" />}
            label="Folders"
            active={isActive("/folders")}
          />
        </div>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Login</span>
              </Link>

              <Link
                to="/register"
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <div className="hidden items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 sm:flex">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {user.username}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </nav>

      <div className="flex justify-around border-t border-gray-200 py-2 md:hidden">
        <NavItem
          to="/"
          icon={<Home className="h-5 w-5" />}
          label="Home"
          active={isActive("/")}
          mobile
        />
        <NavItem
          to="/bookmarks"
          icon={<Bookmark className="h-5 w-5" />}
          label="Saved"
          active={isActive("/bookmarks")}
          mobile
        />
        <NavItem
          to="/folders"
          icon={<FolderOpen className="h-5 w-5" />}
          label="Folders"
          active={isActive("/folders")}
          mobile
        />
      </div>
    </header>
  );
}

export default Navbar;