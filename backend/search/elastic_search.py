from elasticsearch import Elasticsearch
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

INDEX_NAME = "cyosojvp_recipes"

es = Elasticsearch("http://localhost:9200")


def search_recipes(query):
    if not query:
        return {
            "results": [],
            "suggestions": []
        }

    body = {
        "size": 12,
        "query": {
            "multi_match": {
                "query": query,
                "fields": [
                    "Name_clean^5",
                    "RecipeIngredientParts_clean^2",
                    "RecipeInstructions_clean"
                ],
                "type": "cross_fields",
                "operator": "and"
            }
        },
        "suggest": {
            "text": query,
            "spell_suggest": {
                "phrase": {
                    "field": "Name_clean",
                    "size": 1,
                    "gram_size": 3,
                    "direct_generator": [
                        {
                            "field": "Name_clean",
                            "suggest_mode": "always"
                        }
                    ]
                }
            }
        },
        "highlight": {
            "fields": {
                "RecipeInstructions_clean": {
                    "pre_tags": ["**"],
                    "post_tags": ["**"],
                    "fragment_size": 100,
                    "number_of_fragments": 1
                }
            }
        }
    }

    response = es.search(index=INDEX_NAME, body=body)

    suggestions = []
    suggest_data = response.get("suggest", {}).get("spell_suggest", [])
    if suggest_data and suggest_data[0].get("options"):
        for option in suggest_data[0]["options"]:
            text = option.get("text", "").strip()
            if text and text.lower() != query.lower():
                suggestions.append(text)

    max_score = response["hits"].get("max_score") or 1.0

    hits = []
    for i, hit in enumerate(response["hits"]["hits"]):
        item = hit["_source"].copy()

        raw_id = hit.get("_id")
        try:
            item["recipe_id"] = int(raw_id)
        except (TypeError, ValueError):
            item["recipe_id"] = raw_id

        score = round((hit["_score"] / max_score), 4) if hit.get("_score") else 0.0
        rank = i + 1

        item["Score"] = score
        item["Rank"] = rank

        if "highlight" in hit and "RecipeInstructions_clean" in hit["highlight"]:
            item["Snippet"] = hit["highlight"]["RecipeInstructions_clean"][0]

        hits.append(item)

    return {
        "results": hits,
        "suggestions": suggestions
    }