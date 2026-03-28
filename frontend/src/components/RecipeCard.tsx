import React from "react";
import { Clock, Bookmark } from "lucide-react";
import { motion } from "framer-motion";

type Recipe = {
  recipe_id?: number;

  Name?: string;
  RecipeCategory?: string;
  Images?: string | string[];
  TotalTime?: string;
  Score?: number;

  name?: string;
  category?: string;
  image_url?: string;
  images?: string | string[];
  score?: number;
};

type Props = {
  recipe: Recipe;
  onViewDetails: (recipe: Recipe) => void;
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

export default function RecipeCard({ recipe, onViewDetails }: Props) {
  const recipeName = recipe.Name || recipe.name || "Unknown Recipe";
  const recipeCategory =
    recipe.RecipeCategory || recipe.category || "Unknown category";
  const imageSrc = parseImage(
    recipe.Images || recipe.image_url || recipe.images || ""
  );
  const hasImage = imageSrc.trim() !== "";

  const score =
    recipe.Score !== undefined
      ? recipe.Score
      : recipe.score !== undefined
      ? recipe.score
      : undefined;

  const totalTime = recipe.TotalTime || "Unknown time";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      onClick={() => onViewDetails(recipe)}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {hasImage ? (
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
            hasImage ? "hidden" : "flex"
          }`}
        >
          No Image
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
          {recipeCategory}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(recipe);
          }}
          className="absolute right-3 top-3 rounded-full bg-white/80 p-2 backdrop-blur-sm transition hover:bg-white"
        >
          <Bookmark className="h-4 w-4 text-gray-700" />
        </button>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-1 text-lg font-semibold text-gray-900">
          {recipeName}
        </h3>

        <p className="mt-1 line-clamp-2 text-sm text-gray-500">
          Click to view ingredients, cooking steps, and bookmark this recipe.
        </p>

        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {totalTime}
          </span>

          {score !== undefined && (
            <span className="rounded-full bg-orange-50 px-2 py-1 font-medium text-orange-600">
              Score: {Number(score).toFixed(2)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(recipe);
          }}
          className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black"
        >
          View Details
        </button>
      </div>
    </motion.div>
  );
}