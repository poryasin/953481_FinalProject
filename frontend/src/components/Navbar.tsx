import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

type User = {
  user_id: number;
  username: string;
  email: string;
  created_at?: string;
};

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

  const linkClass = (path: string) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition ${
      location.pathname === path
        ? "bg-orange-500 text-white"
        : "text-gray-700 hover:bg-orange-100 hover:text-orange-600"
    }`;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-bold text-orange-500">
          Recipe App
        </Link>

        <div className="flex items-center gap-2">

          <Link to="/bookmarks" className={linkClass("/bookmarks")}>
            Bookmark
          </Link>

          <Link to="/folders" className={linkClass("/folders")}>
            Folder
          </Link>

          {!user ? (
            <Link to="/login" className={linkClass("/login")}>
              Login
            </Link>
          ) : (
            <>
              <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                {user.username}
              </span>

              <button
                onClick={handleLogout}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-red-100 hover:text-red-600"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;