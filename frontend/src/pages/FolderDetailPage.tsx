import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import { API_BASE_URL } from "../api/config";

type Bookmark = {
  bookmark_id?: number;
  recipe_id?: number;
  rating?: number;
  Name?: string;
  RecipeCategory?: string;
  Images?: string | string[];
  name?: string;
  category?: string;
  image_url?: string;
  images?: string | string[];
};

function parseImage(value: unknown): string {
  if (!value) return "";

  if (Array.isArray(value)) {
    const firstValid = value.find((item) => String(item).trim());
    return firstValid ? String(firstValid).trim() : "";
  }

  const text = String(value).trim();
  if (!text) return "";

  if (text.startsWith("http://") || text.startsWith("https://")) {
    return text;
  }

  try {
    const parsed = JSON.parse(text.replace(/'/g, '"'));
    if (Array.isArray(parsed) && parsed.length > 0) {
      return String(parsed[0] || "").trim();
    }
  } catch {
    // ignore
  }

  const cleaned = text
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/^["']/, "")
    .replace(/["']$/, "")
    .trim();

  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }

  const firstItem = cleaned
    .split(",")
    .map((item) => item.replace(/^["']/, "").replace(/["']$/, "").trim())
    .find(Boolean);

  return firstItem || "";
}

function FolderDetailPage() {
  const { folderId } = useParams();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFolderBookmarks = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setBookmarks([]);
        setError("Please login to view bookmarks in this folder");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `${API_BASE_URL}/folders/${folderId}/bookmarks`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const text = await res.text();
        let data: any = [];

        try {
          data = text ? JSON.parse(text) : [];
        } catch {
          data = [];
        }

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch folder bookmarks");
        }

        setBookmarks(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error(err);
        setBookmarks([]);
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchFolderBookmarks();
  }, [folderId]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link
          to="/folders"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to folders
        </Link>

        <div className="flex items-center gap-3">
          <FolderOpen className="h-7 w-7 text-orange-500" />
          <h1 className="text-3xl font-bold text-gray-900">Folder Bookmarks</h1>
        </div>

        <p className="mt-2 text-gray-500">
          {bookmarks.length} recipe{bookmarks.length !== 1 ? "s" : ""} in this
          folder
        </p>

        {loading && (
          <div className="mt-8 rounded-2xl bg-white p-4 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
            Loading bookmarks...
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-2xl bg-red-50 p-4 text-red-600 shadow-sm ring-1 ring-red-200">
            {error}
          </div>
        )}

        {!loading && !error && bookmarks.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {bookmarks.map((item, index) => {
              const recipeName = item.Name || item.name || "Unknown Recipe";
              const recipeCategory =
                item.RecipeCategory || item.category || "Unknown category";
              const imageSrc = parseImage(
                item.Images || item.image_url || item.images || ""
              );

              return (
                <motion.div
                  key={item.bookmark_id ?? item.recipe_id ?? index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={recipeName}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback =
                            e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}

                    <div
                      className={`h-full w-full items-center justify-center text-gray-400 ${
                        imageSrc ? "hidden" : "flex"
                      }`}
                    >
                      No Image
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                    <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                      {recipeCategory}
                    </span>

                    <span className="absolute right-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-gray-700 backdrop-blur-sm">
                      Rating: {item.rating ?? "-"}
                    </span>
                  </div>

                  <div className="p-4">
                    <h2 className="line-clamp-2 text-lg font-semibold text-gray-900">
                      {recipeName}
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                      Saved inside this folder.
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          !loading &&
          !error && (
            <div className="mt-16 text-center">
              <FolderOpen className="mx-auto h-16 w-16 text-gray-300" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Empty folder
              </h2>
              <p className="mt-2 text-gray-500">
                No bookmarks in this folder yet.
              </p>
            </div>
          )
        )}
      </main>
    </div>
  );
}

export default FolderDetailPage;