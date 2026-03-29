import os
import ast
import pickle
import pandas as pd
from sklearn.metrics.pairwise import linear_kernel


class RecommenderService:
    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(__file__))

        self.data_path = os.path.join(base_dir, "resources", "cleaned_ready_for_es.pkl")
        self.recipe_idx_path = os.path.join(base_dir, "model_artifacts", "recipe_id_to_idx.pkl")
        self.tfidf_path = os.path.join(base_dir, "model_artifacts", "tfidf.pkl")
        self.tfidf_matrix_path = os.path.join(base_dir, "model_artifacts", "tfidf_matrix.pkl")

        self.recipes = None
        self.recipe_id_to_idx = None
        self.vectorizer = None
        self.tfidf_matrix = None

        self.recipe_id_col = "RecipeId"
        self.name_col = "Name"
        self.image_col = "Images"
        self.instructions_col = "RecipeInstructions"
        self.ingredients_col = "RecipeIngredientParts"
        self.description_col = "Description"
        self.rating_col = "AggregatedRating"
        self.review_count_col = "ReviewCount"
        self.category_col = "RecipeCategory"
        self.total_time_col = "TotalTime"

        self.load()

    def load(self):
        print("Loading recipes...")
        self.recipes = pd.read_pickle(self.data_path).reset_index(drop=True)

        print("Loading recipe_id_to_idx...")
        with open(self.recipe_idx_path, "rb") as f:
            self.recipe_id_to_idx = pickle.load(f)

        print("Loading tfidf vectorizer...")
        with open(self.tfidf_path, "rb") as f:
            self.vectorizer = pickle.load(f)

        print("Loading precomputed tfidf matrix...")
        with open(self.tfidf_matrix_path, "rb") as f:
            self.tfidf_matrix = pickle.load(f)

        if not hasattr(self.vectorizer, "transform"):
            raise ValueError(
                f"tfidf.pkl is not a TfidfVectorizer-like object. Got: {type(self.vectorizer)}"
            )

        if not hasattr(self.tfidf_matrix, "shape"):
            raise ValueError(
                f"tfidf_matrix.pkl is not a matrix-like object. Got: {type(self.tfidf_matrix)}"
            )

        if len(self.recipes) != self.tfidf_matrix.shape[0]:
            raise ValueError(
                f"recipes rows ({len(self.recipes)}) do not match tfidf_matrix rows ({self.tfidf_matrix.shape[0]})"
            )

        print("DEBUG recipes shape:", self.recipes.shape)
        print("DEBUG tfidf matrix shape:", self.tfidf_matrix.shape)

    def _safe_value(self, value):
        try:
            if pd.isna(value):
                return None
        except Exception:
            pass
        return value

    def _normalize_list_like(self, value):
        if value is None:
            return []

        if isinstance(value, list):
            return value

        if isinstance(value, tuple):
            return list(value)

        if isinstance(value, str):
            value = value.strip()
            if not value:
                return []

            if value.startswith("[") and value.endswith("]"):
                try:
                    parsed = ast.literal_eval(value)
                    if isinstance(parsed, list):
                        return parsed
                except Exception:
                    pass

            return [value]

        return [value]

    def _extract_image(self, value):
        if value is None:
            return None

        if isinstance(value, list):
            for item in value:
                text = str(item).strip()
                if text.startswith("http://") or text.startswith("https://"):
                    return text
            return None

        if isinstance(value, tuple):
            for item in value:
                text = str(item).strip()
                if text.startswith("http://") or text.startswith("https://"):
                    return text
            return None

        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None

            if value.startswith("[") and value.endswith("]"):
                try:
                    parsed = ast.literal_eval(value)
                    if isinstance(parsed, list):
                        for item in parsed:
                            text = str(item).strip()
                            if text.startswith("http://") or text.startswith("https://"):
                                return text
                except Exception:
                    pass

            if value.startswith("http://") or value.startswith("https://"):
                return value

        return None

    def _serialize_recipe(self, row):
        image_value = self._extract_image(row.get(self.image_col))

        ingredients = self._normalize_list_like(row.get(self.ingredients_col))
        instructions = self._normalize_list_like(row.get(self.instructions_col))

        recipe_id_raw = row.get(self.recipe_id_col)
        recipe_id = int(recipe_id_raw) if recipe_id_raw is not None else None

        rating = row.get(self.rating_col)
        review_count = row.get(self.review_count_col)

        name_value = self._safe_value(row.get(self.name_col))
        category_value = self._safe_value(row.get(self.category_col))
        description_value = self._safe_value(row.get(self.description_col))
        total_time_value = self._safe_value(row.get(self.total_time_col))

        return {
            "recipe_id": recipe_id,
            "name": name_value,
            "Name": name_value,
            "category": category_value,
            "RecipeCategory": category_value,
            "description": description_value,
            "Description": description_value,
            "total_time": total_time_value,
            "TotalTime": total_time_value,
            "ingredients": ingredients,
            "ingredient_parts": ingredients,
            "RecipeIngredientParts": ingredients,
            "instructions": instructions,
            "RecipeInstructions": instructions,
            "image": image_value,
            "images": [image_value] if image_value else [],
            "image_url": image_value,
            "Images": [image_value] if image_value else [],
            "rating": float(rating) if rating is not None and not pd.isna(rating) else None,
            "review_count": int(review_count) if review_count is not None and not pd.isna(review_count) else None,
        }

    def get_random_recipes(self, limit=8):
        if self.recipes is None or len(self.recipes) == 0:
            return []

        sample_df = self.recipes.sample(min(limit, len(self.recipes)))
        return [self._serialize_recipe(row) for _, row in sample_df.iterrows()]

    def _get_index_from_recipe_id(self, recipe_id):
        if recipe_id in self.recipe_id_to_idx:
            return self.recipe_id_to_idx[recipe_id]

        recipe_id_str = str(recipe_id)
        if recipe_id_str in self.recipe_id_to_idx:
            return self.recipe_id_to_idx[recipe_id_str]

        return None

    def recommend_from_recipe_ids(self, seed_recipe_ids, limit=8):
        if not seed_recipe_ids:
            return self.get_random_recipes(limit=limit)

        seed_recipe_ids_set = set()
        for x in seed_recipe_ids:
            try:
                seed_recipe_ids_set.add(int(x))
            except Exception:
                continue

        valid_indices = []
        for recipe_id in seed_recipe_ids_set:
            idx = self._get_index_from_recipe_id(recipe_id)
            if idx is not None:
                try:
                    idx = int(idx)
                    if 0 <= idx < len(self.recipes):
                        valid_indices.append(idx)
                except Exception:
                    continue

        if not valid_indices:
            return self.get_random_recipes(limit=limit)

        cosine_sim = linear_kernel(
            self.tfidf_matrix[valid_indices],
            self.tfidf_matrix
        )

        scores = cosine_sim.mean(axis=0)

        if hasattr(scores, "A1"):
            scores = scores.A1
        elif hasattr(scores, "tolist"):
            scores = scores.tolist()

        scored_items = list(enumerate(scores))
        scored_items.sort(key=lambda x: x[1], reverse=True)

        results = []
        used_recipe_ids = set(seed_recipe_ids_set)
        added_recipe_ids = set()

        for idx, score in scored_items:
            try:
                row = self.recipes.iloc[idx]
                recipe_id = int(row[self.recipe_id_col])
            except Exception:
                continue

            if recipe_id in used_recipe_ids or recipe_id in added_recipe_ids:
                continue

            results.append(self._serialize_recipe(row))
            added_recipe_ids.add(recipe_id)

            if len(results) >= limit:
                break

        if not results:
            return self.get_random_recipes(limit=limit)

        return results