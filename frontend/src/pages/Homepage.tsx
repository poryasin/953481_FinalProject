import { useEffect, useState, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import RecipeCard from "../components/RecipeCard";
import { API_BASE_URL } from "../api/config";
import heroImage from "../assets/background.jpeg";


type Recipe = {
  recipe_id?: number;
  Name?: string;
  RecipeCategory?: string;
  RecipeIngredientParts?: string[] | string;
  RecipeInstructions?: string[] | string;
  Images?: string | string[];
  TotalTime?: string;
  Score?: number;
  Rank?: number;
  image?: string;

  name?: string;
  category?: string;
  ingredient_parts?: string[] | string;
  instructions?: string[] | string;
  image_url?: string;
  images?: string | string[];
};

type Folder = {
  folder_id: number;
  folder_name: string;
};

type RecipeModalProps = {
  recipe: Recipe | null;
  folders: Folder[];
  selectedFolderId: number;
  setSelectedFolderId: React.Dispatch<React.SetStateAction<number>>;
  rating: number;
  setRating: React.Dispatch<React.SetStateAction<number>>;
  isLoggedIn: boolean;
  onClose: () => void;
  onBookmark: () => void;
  onGoLogin: () => void;
};

function parseList(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  const text = String(value).trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text.replace(/'/g, '"'));
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    //
  }

  return text
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(/\||\n|,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((item) => item.replace(/^["']/, "").replace(/["']$/, "").trim())
    .filter(Boolean);
}

function parseSteps(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  const text = String(value).trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text.replace(/'/g, '"'));
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    //
  }

  return text
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(/\n+|\|\s*|\d+\.\s+/)
    .map((step) => step.replace(/^["']/, "").replace(/["']$/, "").trim())
    .filter(Boolean);
}

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
    //
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

function RecipeModal({
  recipe,
  folders,
  selectedFolderId,
  setSelectedFolderId,
  rating,
  setRating,
  isLoggedIn,
  onClose,
  onBookmark,
  onGoLogin,
}: RecipeModalProps) {
  if (!recipe) return null;

  const recipeName = recipe.Name || recipe.name || "Unknown";
  const recipeCategory = recipe.RecipeCategory || recipe.category || "-";

  const imageSrc = parseImage(
    recipe.Images || recipe.image_url || recipe.images || recipe.image || ""
  );

  const ingredients = parseList(
    recipe.RecipeIngredientParts ||
      recipe.ingredient_parts ||
      (recipe as { ingredients?: string[] | string }).ingredients ||
      []
  );

  const steps = parseSteps(
    recipe.RecipeInstructions ||
      recipe.instructions ||
      (recipe as { instructions?: string[] | string }).instructions ||
      []
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{recipeName}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Category: {recipeCategory}
            </p>
          </div>

          <button
            className="rounded-full px-3 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={recipeName}
                className="h-72 w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback =
                    e.currentTarget.nextElementSibling as HTMLDivElement | null;
                  if (fallback) fallback.classList.remove("hidden");
                }}
              />
            ) : null}

            <div
              className={`flex h-72 w-full items-center justify-center text-xl text-gray-400 ${
                imageSrc ? "hidden" : ""
              }`}
            >
              No Image
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                Ingredients
              </h3>

              {ingredients.length > 0 ? (
                <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
                  {ingredients.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">
                  No ingredients available.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                Cooking Steps
              </h3>

              {steps.length > 0 ? (
                <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-700">
                  {steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-gray-500">
                  No cooking steps available.
                </p>
              )}
            </div>
          </div>

          {isLoggedIn ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Save to Bookmark
              </h3>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Folder
                </label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                >
                  {folders.length === 0 ? (
                    <option value={0}>No folder available</option>
                  ) : (
                    folders.map((folder) => (
                      <option key={folder.folder_id} value={folder.folder_id}>
                        {folder.folder_name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[5, 4, 3, 2, 1].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                        rating === value
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-orange-100"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={onBookmark}
                disabled={folders.length === 0}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Bookmark
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                Bookmark
              </h3>
              <p className="mb-4 text-sm text-gray-600">
                Please login first if you want to bookmark this recipe.
              </p>
              <button
                onClick={onGoLogin}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 font-medium text-white transition hover:bg-orange-600"
              >
                Login to Bookmark
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Homepage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<Recipe[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number>(0);
  const [rating, setRating] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);
  const [foldersLoading, setFoldersLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [randomRecipes, setRandomRecipes] = useState<Recipe[]>([]);
  const [randomLoading, setRandomLoading] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const token = localStorage.getItem("token");
  const isLoggedIn = !!token;

  useEffect(() => {
    const fetchFolders = async () => {
      if (!token) {
        setFolders([]);
        return;
      }

      try {
        setFoldersLoading(true);

        const res = await fetch(`${API_BASE_URL}/folders`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch folders");
        }

        const data: Folder[] = await res.json();
        setFolders(data);

        if (data.length > 0) {
          setSelectedFolderId(data[0].folder_id);
        }
      } catch (err) {
        console.error(err);
        setFolders([]);
      } finally {
        setFoldersLoading(false);
      }
    };

    fetchFolders();
  }, [token]);

  const fetchRandomRecipes = async (): Promise<void> => {
  try {
    setRandomLoading(true);

    const res = await fetch(`${API_BASE_URL}/recipes/random?size=8`);

    if (!res.ok) {
      throw new Error("Failed to fetch random recipes");
    }

    const data: Recipe[] = await res.json();
    setRandomRecipes(data);
  } catch (err) {
    console.error(err);
    setRandomRecipes([]);
  } finally {
    setRandomLoading(false);
  }
};

  useEffect(() => {
    fetchRandomRecipes();
  }, [isLoggedIn]);

const fetchRecommendations = async (folderId?: number) => {
  if (!token) return;

  try {
    setLoadingRecommendations(true);

    let url = `${API_BASE_URL}/recommendations`;
    if (folderId && folderId > 0) {
      url += `?folder_id=${folderId}`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to fetch recommendations");
    }

    setRecommendations(data);
  } catch (err) {
    console.error("Recommendation error:", err);
    setRecommendations(null);
  } finally {
    setLoadingRecommendations(false);
  }
};
useEffect(() => {
  if (isLoggedIn) {
    fetchRecommendations();
  }
}, [isLoggedIn]);

useEffect(() => {
  if (isLoggedIn && selectedFolderId > 0) {
    fetchRecommendations(selectedFolderId);
  }
}, [selectedFolderId]);

  const handleSearch = async (): Promise<void> => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `${API_BASE_URL}/search?q=${encodeURIComponent(query)}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch search results");
      }

      const data = await res.json();
      setResults(Array.isArray(data.results) ? data.results : []);
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setActiveCategory("All");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const openRecipeModal = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setRating(5);

    if (folders.length > 0) {
      setSelectedFolderId(folders[0].folder_id);
    } else {
      setSelectedFolderId(0);
    }
  };

  const handleBookmark = async (): Promise<void> => {
    const tokenFromStorage = localStorage.getItem("token");

    if (!tokenFromStorage) {
      alert("Please login first to create a bookmark");
      return;
    }

    if (!selectedRecipe) {
      alert("No recipe selected");
      return;
    }

    if (!selectedRecipe.recipe_id) {
      alert("Recipe ID not found");
      return;
    }

    if (!selectedFolderId || selectedFolderId === 0) {
      alert("Please select a folder");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/bookmarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenFromStorage}`,
        },
        body: JSON.stringify({
          recipe_id: selectedRecipe.recipe_id,
          folder_id: selectedFolderId,
          rating,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to bookmark recipe");
      }

      alert("Bookmark saved to folder successfully");
      setSelectedRecipe(null);
      navigate("/bookmarks");
    } catch (err) {
      console.error(err);
      alert("Failed to bookmark recipe");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };


  const sourceRecipes =
  results.length > 0 ? results : randomRecipes;

  const categories = [
    "All",
    ...Array.from(
      new Set(
        sourceRecipes
          .map((recipe) => recipe.RecipeCategory || recipe.category)
          .filter(Boolean) as string[]
      )
    ),
  ];

  const filteredRecipes =
    activeCategory === "All"
      ? sourceRecipes
      : sourceRecipes.filter(
          (recipe) =>
            (recipe.RecipeCategory || recipe.category) === activeCategory
        );

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="relative h-[420px] overflow-hidden">
        <img
          src={heroImage}
          alt="background"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl font-bold text-white md:text-5xl">
              Discover Delicious Recipes
            </h1>
            <p className="mt-4 text-lg text-white/90">
              Search, explore, and save your favorite recipes in one place.
            </p>

            <div className="relative mt-8 max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search recipes by name, ingredients, or cooking steps..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-14 w-full rounded-full border-none bg-white pl-12 pr-36 text-gray-900 shadow-xl outline-none"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-orange-500 px-6 py-3 font-medium text-white transition hover:bg-orange-600"
              >
                Search
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {categories.length > 1 && (
        <section className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeCategory === cat
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-orange-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-12">
        {foldersLoading && (
          <p className="mb-4 rounded-xl bg-white p-4 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
            Loading folders...
          </p>
        )}

        {loading && (
          <p className="rounded-xl bg-white p-4 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
            Loading...
          </p>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 p-4 text-center text-red-600 shadow-sm ring-1 ring-red-200">
            {error}
          </p>
        )}

        {!foldersLoading && isLoggedIn && folders.length === 0 && (
          <p className="mt-4 rounded-xl bg-yellow-50 p-4 text-center text-yellow-700 shadow-sm ring-1 ring-yellow-200">
            No folders found. Please create a folder first before bookmarking.
          </p>
        )}

      {!loading && suggestions.length > 0 && (
  <div className="mb-6 rounded-xl bg-orange-50 p-4 text-orange-700 shadow-sm ring-1 ring-orange-200">
    <p className="text-sm">
      Did you mean{" "}
      <button
        type="button"
        onClick={() => {
          setQuery(suggestions[0]);
          setTimeout(() => {
            const run = async () => {
              try {
                setLoading(true);
                setError("");
                const res = await fetch(
                  `${API_BASE_URL}/search?q=${encodeURIComponent(suggestions[0])}`
                );
                const data = await res.json();
                setResults(Array.isArray(data.results) ? data.results : []);
                setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
                setActiveCategory("All");
              } catch (err) {
                setError("Failed to fetch search results");
              } finally {
                setLoading(false);
              }
            };
            run();
          }, 0);
        }}
        className="font-semibold underline hover:text-orange-900"
      >
        {suggestions[0]}
      </button>
      ?
    </p>
  </div>
)}

{isLoggedIn && results.length === 0 && (
  <section className="mt-2 space-y-10">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-bold text-gray-900">
        Personalized Recommendations
      </h2>
    </div>

    {loadingRecommendations ? (
      <p className="rounded-xl bg-white p-4 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
        Loading recommendations...
      </p>
    ) : (
      <>
        <div>
          <h3 className="mb-4 text-xl font-semibold text-gray-900">
            From all folders
          </h3>

          {recommendations?.all_folders?.length ? (
            <div className="flex gap-6 overflow-x-auto pb-2">
              {recommendations.all_folders.map((item: any, index: number) => (
                <div
                  key={item.recipe_id ?? `all-${index}`}
                  className="w-[320px] min-w-[320px] flex-shrink-0"
                >
                  <RecipeCard
                    recipe={item}
                    onViewDetails={openRecipeModal}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-white p-4 text-center text-gray-500 shadow-sm ring-1 ring-gray-200">
              No recommendations from all folders yet.
            </p>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-gray-900">
              From selected folder
            </h3>

            {folders.length > 0 && (
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(Number(e.target.value))}
                className="rounded-xl border border-gray-300 px-4 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
              >
                {folders.map((folder) => (
                  <option key={folder.folder_id} value={folder.folder_id}>
                    {folder.folder_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {recommendations?.selected_folder_recommendations?.length ? (
            <div className="flex gap-6 overflow-x-auto pb-2">
              {recommendations.selected_folder_recommendations.map((item: any, index: number) => (
                <div
                  key={item.recipe_id ?? `folder-${index}`}
                  className="w-[320px] min-w-[320px] flex-shrink-0"
                >
                  <RecipeCard
                    recipe={item}
                    onViewDetails={openRecipeModal}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-white p-4 text-center text-gray-500 shadow-sm ring-1 ring-gray-200">
              No recommendations from this folder yet.
            </p>
          )}
        </div>

        <div>
          <h3 className="mb-4 text-xl font-semibold text-gray-900">
            Random dishes
          </h3>

          {recommendations?.random?.length ? (
            <div className="flex gap-6 overflow-x-auto pb-2">
              {recommendations.random.map((item: any, index: number) => (
                <div
                  key={item.recipe_id ?? `random-${index}`}
                  className="w-[320px] min-w-[320px] flex-shrink-0"
                >
                  <RecipeCard
                    recipe={item}
                    onViewDetails={openRecipeModal}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-white p-4 text-center text-gray-500 shadow-sm ring-1 ring-gray-200">
              No random recommendations available.
            </p>
          )}
        </div>
      </>
    )}
  </section>
)}

{!isLoggedIn && (
  <section className="mt-2">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-2xl font-bold text-gray-900">
        {results.length > 0 ? "Search Results" : "Random Recipes"}
      </h2>

      {!results.length && (
        <button
          onClick={fetchRandomRecipes}
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
        >
          Random Again
        </button>
      )}
    </div>

    {randomLoading && results.length === 0 ? (
      <p className="rounded-xl bg-white p-4 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
        Loading random recipes...
      </p>
    ) : filteredRecipes.length === 0 ? (
      <p className="rounded-xl bg-white p-4 text-center text-gray-500 shadow-sm ring-1 ring-gray-200">
        No recipes found.
      </p>
    ) : (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredRecipes.map((item, index) => (
          <RecipeCard
            key={
              item.recipe_id ??
              `${item.Name ?? item.name ?? "recipe"}-${index}`
            }
            recipe={item}
            onViewDetails={openRecipeModal}
          />
        ))}
      </div>
    )}
  </section>
)}

{isLoggedIn && results.length > 0 && (
  <section className="mt-2">
    <h2 className="mb-4 text-2xl font-bold text-gray-900">
      Search Results
      <span className="ml-2 text-base font-normal text-gray-500">
        ({filteredRecipes.length})
      </span>
    </h2>

    {filteredRecipes.length === 0 ? (
      <p className="rounded-xl bg-white p-4 text-center text-gray-500 shadow-sm ring-1 ring-gray-200">
        No recipes found in this category.
      </p>
    ) : (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredRecipes.map((item, index) => (
          <RecipeCard
            key={
              item.recipe_id ??
              `${item.Name ?? item.name ?? "recipe"}-${index}`
            }
            recipe={item}
            onViewDetails={openRecipeModal}
          />
        ))}
      </div>
    )}
  </section>
)}
      </main>

      <RecipeModal
        recipe={selectedRecipe}
        folders={folders}
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={setSelectedFolderId}
        rating={rating}
        setRating={setRating}
        isLoggedIn={isLoggedIn}
        onClose={() => setSelectedRecipe(null)}
        onBookmark={handleBookmark}
        onGoLogin={() => navigate("/login")}
      />
    </div>
  );
}

export default Homepage;