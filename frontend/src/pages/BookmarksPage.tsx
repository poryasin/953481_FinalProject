import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { API_BASE_URL } from "../api/config";

type Bookmark = {
  bookmark_id?: number;
  rating?: number;

  // กรณี backend ส่งข้อมูล recipe ไว้ข้างใน object recipe
  recipe?: {
    recipe_id?: number;
    Name?: string;
    RecipeCategory?: string;
    Images?: string;
    name?: string;
    category?: string;
    image_url?: string;
    images?: string;
  };

  // กรณี backend ส่งข้อมูล recipe มา top-level
  recipe_id?: number;
  Name?: string;
  RecipeCategory?: string;
  Images?: string;
  name?: string;
  category?: string;
  image_url?: string;
  images?: string;
};

function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white text-gray-900">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Bookmarks</h1>

        {!localStorage.getItem("token") && (
          <p className="rounded-xl bg-yellow-50 p-4 text-yellow-700 ring-1 ring-yellow-200">
            You can open this page without logging in, but please login to save and manage bookmarks.
          </p>
        )}

        {loading && (
          <p className="rounded-xl bg-white p-4 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
            Loading bookmarks...
          </p>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 p-4 text-red-600 ring-1 ring-red-200">
            {error}
          </p>
        )}

        {!loading && bookmarks.length === 0 && (
          <p className="rounded-xl bg-gray-50 p-4 text-gray-600 ring-1 ring-gray-200">
            No bookmarks found.
          </p>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((item, index) => {
            const recipeData = item.recipe || item;

            const recipeName =
              recipeData?.Name ||
              recipeData?.name ||
              "Unknown Recipe";

            const recipeCategory =
              recipeData?.RecipeCategory ||
              recipeData?.category ||
              "-";

            const imageSrc =
              recipeData?.Images ||
              recipeData?.image_url ||
              recipeData?.images ||
              "";

            return (
              <div
                key={item.bookmark_id ?? item.recipe_id ?? index}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={recipeName}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-gray-100 text-gray-400">
                    No Image
                  </div>
                )}

                <div className="p-4">
                  <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {recipeName}
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Category: {recipeCategory}
                  </p>

                  <p className="mt-3 text-sm font-medium text-gray-700">
                    Rating: {item.rating ?? "-"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default BookmarksPage;