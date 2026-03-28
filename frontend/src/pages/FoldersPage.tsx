import { useEffect, useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { motion } from "framer-motion";
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
  const [dialogOpen, setDialogOpen] = useState(false);

  const token = localStorage.getItem("token");
  const isLoggedIn = !!token;

  const fetchFolders = async () => {
    const tokenFromStorage = localStorage.getItem("token");

    if (!tokenFromStorage) {
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
          Authorization: `Bearer ${tokenFromStorage}`,
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

  const handleCreateFolder = async () => {
    const tokenFromStorage = localStorage.getItem("token");

    if (!tokenFromStorage) {
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
          Authorization: `Bearer ${tokenFromStorage}`,
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
      setDialogOpen(false);
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
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <FolderOpen className="h-7 w-7 text-orange-500" />
              <h1 className="text-3xl font-bold text-gray-900">Folders</h1>
            </div>
            <p className="mt-2 text-gray-500">
              Organize your bookmarked recipes into collections.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            disabled={!isLoggedIn}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Plus className="h-4 w-4" />
            New Folder
          </button>
        </div>

        {!isLoggedIn && (
          <div className="mt-6 rounded-2xl bg-yellow-50 p-4 text-yellow-700 shadow-sm ring-1 ring-yellow-200">
            You can open this page without logging in, but you need to login to
            create folders and view bookmarks inside them.
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-red-600 shadow-sm ring-1 ring-red-200">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-6 rounded-2xl bg-white p-4 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
            Loading folders...
          </div>
        )}

        {!loading && folders.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <motion.button
                key={folder.folder_id}
                type="button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => handleOpenFolder(folder.folder_id)}
                className="group relative rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <FolderOpen className="h-10 w-10 text-orange-400" />
                <h3 className="mt-3 text-lg font-semibold text-gray-900">
                  {folder.folder_name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Folder ID: {folder.folder_id}
                  {folder.created_at ? ` · ${folder.created_at}` : ""}
                </p>
                <p className="mt-3 text-sm font-medium text-orange-500">
                  View bookmarks →
                </p>
              </motion.button>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="mt-16 text-center">
              <FolderOpen className="mx-auto h-16 w-16 text-gray-300" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                No folders yet
              </h2>
              <p className="mt-2 text-gray-500">
                {isLoggedIn
                  ? "Create your first folder to start organizing recipes."
                  : "Please login to create your first folder."}
              </p>
            </div>
          )
        )}
      </main>

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            if (!creating) setDialogOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-900">
              Create New Folder
            </h2>

            <div className="mt-4 space-y-4">
              <input
                type="text"
                placeholder="Folder name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateFolder();
                  }
                }}
                disabled={creating}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  disabled={creating}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={creating}
                  className="flex-1 rounded-xl bg-orange-500 px-4 py-3 font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FoldersPage;