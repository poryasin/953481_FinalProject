import os
import pickle
import pandas as pd


def main():
    base_dir = os.path.dirname(os.path.dirname(__file__))

    data_path = os.path.join(base_dir, "resources", "cleaned_ready_for_es.pkl")
    tfidf_path = os.path.join(base_dir, "model_artifacts", "tfidf.pkl")
    output_path = os.path.join(base_dir, "model_artifacts", "tfidf_matrix.pkl")

    print("Loading dataset...")
    recipes = pd.read_pickle(data_path).reset_index(drop=True)

    print("Loading TF-IDF vectorizer...")
    with open(tfidf_path, "rb") as f:
        vectorizer = pickle.load(f)

    if not hasattr(vectorizer, "transform"):
        raise ValueError(f"tfidf.pkl is not a TfidfVectorizer-like object. Got: {type(vectorizer)}")

    print("Building recipe texts...")
    texts = (
        recipes["Name_clean"].fillna("").astype(str).str.strip() + " " +
        recipes["RecipeIngredientParts_clean"].fillna("").astype(str).str.strip() + " " +
        recipes["RecipeInstructions_clean"].fillna("").astype(str).str.strip()
    ).str.strip()

    print("Transforming texts into TF-IDF matrix...")
    tfidf_matrix = vectorizer.transform(texts.tolist())

    print("Saving TF-IDF matrix...")
    with open(output_path, "wb") as f:
        pickle.dump(tfidf_matrix, f)

    print(f"Done: {output_path}")
    print("Matrix shape:", tfidf_matrix.shape)


if __name__ == "__main__":
    main()