const API_BASE_URL = "http://localhost:5000";

export async function getBookmarks(token: string) {
  const response = await fetch(`${API_BASE_URL}/bookmarks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch bookmarks");
  }

  return result;
}

export async function addBookmark(
  token: string,
  recipe: {
    recipe_id: number;
    name: string;
    category?: string;
    image_url?: string;
  }
) {
  const response = await fetch(`${API_BASE_URL}/bookmarks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(recipe),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to add bookmark");
  }

  return result;
}

export async function deleteBookmark(token: string, recipeId: number) {
  const response = await fetch(`${API_BASE_URL}/bookmarks/${recipeId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to delete bookmark");
  }

  return result;
}