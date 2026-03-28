import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { API_BASE_URL } from "../api/config";
import { useNavigate } from "react-router-dom";

type Folder = {
  folder_id: number;
  user_id: number;
  folder_name: string;
  created_at?: string;
};

function FoldersPage() {
  const navigate = useNavigate();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderName, setFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const isLoggedIn = !!token;

  const fetchFolders = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setFolders([]);
      setError("");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE_URL}/folders`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text();
      let data: any = [];

      try {
        data = text ? JSON.parse(text) : [];
      } catch {
        data = [];
      }

      if (!res.ok) {
        setFolders([]);
        throw new Error(data.error || data.msg || "Failed to fetch folders");
      }

      setFolders(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setFolders([]);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please login first to create a folder");
      return;
    }

    if (!folderName.trim()) {
      setError("Please enter folder name");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const res = await fetch(`${API_BASE_URL}/folders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          folder_name: folderName.trim(),
        }),
      });

      const text = await res.text();
      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.error || data.msg || "Failed to create folder");
      }

      setFolderName("");
      fetchFolders();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleOpenFolder = (folderId: number) => {
    if (!isLoggedIn) {
      setError("Please login first to view bookmarks inside folders");
      return;
    }

    navigate(`/folders/${folderId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white text-gray-900">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Folders</h1>
            <p className="mt-2 text-gray-600">
              Organize your bookmarked recipes into folders
            </p>
          </div>
        </div>

        {!isLoggedIn && (
          <div className="mb-6 rounded-xl bg-yellow-50 p-4 text-yellow-700 shadow-sm ring-1 ring-yellow-200">
            You can open this page without logging in, but you need to login to
            create folders and view bookmarks inside them.
          </div>
        )}

        <form
          onSubmit={handleCreateFolder}
          className="mb-8 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200"
        >
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Folder name
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              disabled={!isLoggedIn || creating}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            />

            <button
              type="submit"
              disabled={!isLoggedIn || creating}
              className="rounded-xl bg-orange-500 px-6 py-3 font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {creating ? "Creating..." : "Create Folder"}
            </button>
          </div>
        </form>

        {loading && (
          <p className="rounded-xl bg-white p-4 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
            Loading folders...
          </p>
        )}

        {error && (
          <p className="mb-6 rounded-xl bg-red-50 p-4 text-center text-red-600 shadow-sm ring-1 ring-red-200">
            {error}
          </p>
        )}

        {!loading && folders.length === 0 && (
          <p className="rounded-xl bg-white p-4 text-center text-gray-500 shadow-sm ring-1 ring-gray-200">
            {isLoggedIn
              ? "No folders found."
              : "No folders to display. Please login to create folders."}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <button
              key={folder.folder_id}
              type="button"
              onClick={() => handleOpenFolder(folder.folder_id)}
              className="rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-gray-900">
                {folder.folder_name}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Folder ID: {folder.folder_id}
              </p>
              <p className="mt-3 text-sm font-medium text-orange-500">
                View bookmarks →
              </p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

export default FoldersPage;