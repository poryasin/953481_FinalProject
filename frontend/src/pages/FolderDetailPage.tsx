import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { API_BASE_URL } from "../api/config";

type Bookmark = {
  bookmark_id?: number;
  recipe_id?: number;
  rating?: number;
  Name?: string;
  RecipeCategory?: string;
  Images?: string;
};

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

        const res = await fetch(`${API_BASE_URL}/folders/${folderId}/bookmarks`, {
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
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white text-gray-900">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Folder Bookmarks</h1>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && bookmarks.length === 0 && (
          <p>No bookmarks in this folder.</p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((item, index) => (
            <div
              key={item.bookmark_id ?? item.recipe_id ?? index}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              {item.Images ? (
                <img
                  src={item.Images}
                  alt={item.Name || "Recipe"}
                  className="h-48 w-full object-cover"
                />
              ) : (
                <div className="flex h-48 items-center justify-center bg-gray-100 text-gray-400">
                  No Image
                </div>
              )}

              <div className="p-4">
                <h2 className="text-lg font-semibold">
                  {item.Name || "Unknown Recipe"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Category: {item.RecipeCategory || "-"}
                </p>
                <p className="mt-2 text-sm font-medium">
                  Rating: {item.rating ?? "-"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default FolderDetailPage;