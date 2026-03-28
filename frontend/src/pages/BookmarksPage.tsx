import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import Navbar from "../components/Navbar";
import { API_BASE_URL } from "../api/config";

type BookmarkItem = {
  bookmark_id?: number;
  rating?: number;

  recipe?: {
    recipe_id?: number;
    Name?: string;
    RecipeCategory?: string;
    Images?: string | string[];
    name?: string;
    category?: string;
    image_url?: string;
    images?: string | string[];
  };

  recipe_id?: number;
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

function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBookmarks = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setBookmarks([]);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE_URL}/bookmarks`, {
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
          setBookmarks([]);
          throw new Error(data.error || data.msg || "Failed to fetch bookmarks");
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

    fetchBookmarks();
  }, []);

  const hasToken = !!localStorage.getItem("token");

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-3">
          <Bookmark className="h-7 w-7 text-orange-500" />
          <h1 className="text-3xl font-bold text-gray-900">Bookmarks</h1>
        </div>

        <p className="mt-2 text-gray-500">Your saved recipes in one place.</p>

        {!hasToken && (
          <div className="mt-6 rounded-2xl bg-yellow-50 p-4 text-yellow-700 shadow-sm ring-1 ring-yellow-200">
            You can open this page without logging in, but please login to save and manage bookmarks.
          </div>
        )}

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
              const recipeData = item.recipe || item;

              const recipeName =
                recipeData?.Name ||
                recipeData?.name ||
                "Unknown Recipe";

              const recipeCategory =
                recipeData?.RecipeCategory ||
                recipeData?.category ||
                "Unknown category";

              const imageSrc = parseImage(
                recipeData?.Images ||
                  recipeData?.image_url ||
                  recipeData?.images ||
                  ""
              );

              return (
                <div
                  key={item.bookmark_id ?? item.recipe_id ?? index}
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
                      Saved recipe from your bookmark collection.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !loading &&
          !error && (
            <div className="mt-16 text-center">
              <Bookmark className="mx-auto h-16 w-16 text-gray-300" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                No bookmarks yet
              </h2>
              <p className="mt-2 text-gray-500">
                Start saving recipes from the home page.
              </p>
            </div>
          )
        )}
      </main>
    </div>
  );
}

export default BookmarksPage;