import { useState } from "react";

type Recipe = {
  recipe_id: number;
  name: string;
  category?: string;
  image_url?: string;
  images?: string;
  score?: number;
};

type Props = {
  recipe: Recipe;
  onViewDetails: (recipe: Recipe) => void;
};

export default function RecipeCard({ recipe, onViewDetails }: Props) {
  const imageSrc = recipe.image_url || recipe.images || "";
  const hasImage = imageSrc.trim() !== "";

  return (
    <div style={styles.card}>
      {hasImage ? (
        <img
          src={imageSrc}
          alt={recipe.name}
          style={styles.image}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = "flex";
          }}
        />
      ) : null}

      <div
        style={{
          ...styles.fallback,
          display: hasImage ? "none" : "flex",
        }}
      >
        No Image
      </div>

      <h3>{recipe.name}</h3>
      <p>{recipe.category || "Unknown category"}</p>

      {recipe.score !== undefined && <p>Score: {recipe.score.toFixed(2)}</p>}

      <div style={styles.actions}>
        <button style={styles.primaryBtn} onClick={() => onViewDetails(recipe)}>
          View Details
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "16px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },
  image: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    borderRadius: "12px",
    display: "block",
    marginBottom: "12px",
  },
  fallback: {
    width: "100%",
    height: "180px",
    borderRadius: "12px",
    background: "#f3f4f6",
    color: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "12px",
  },
  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
  },
  primaryBtn: {
    flex: 1,
    padding: "10px",
    borderRadius: "10px",
    border: "none",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
  },
};