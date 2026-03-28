from elasticsearch import Elasticsearch
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

INDEX_NAME = "cyosojvp_recipes"

es = Elasticsearch(
    "http://localhost:9200"
)

def search_recipes(query):
    if not query:
        return "กรุณาใส่คำค้นหา (query)"

    body = {
        "size": 12,
        "query": {
            "multi_match": {
                "query": query,
                # 1. วางตัวคูณคะแนนตรงนี้ครับ ถึงจะถูกต้อง!
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
                            # 2. แก้กลับเป็นของเดิม
                            "field": "Name_clean",
                            "suggest_mode": "always"
                        }
                    ]
                }
            }
        },
        # 3. โบนัส: เพิ่มระบบ Highlight (Score 14)
        "highlight": {
            "fields": {
                "RecipeInstructions_clean": {
                    "pre_tags": ["**"],  # คร่อมตัวหนา
                    "post_tags": ["**"],
                    "fragment_size": 100, # ตัดมาโชว์แค่ 100 ตัวอักษร
                    "number_of_fragments": 1
                }
            }
        }
    }

    response = es.search(index=INDEX_NAME, body=body)

    suggestions = []
    if "suggest" in response and response["suggest"]["spell_suggest"][0]["options"]:
        for option in response["suggest"]["spell_suggest"][0]["options"]:
            suggestions.append(option["text"])

    if suggestions:
        print(f"💡 Did you mean: {', '.join(suggestions)} ?\n")

    max_score = response["hits"]["max_score"]
    if not max_score:
        max_score = 1.0

    print(f"🔍 Results for '{query}':")
    print("="*60)

    hits = []
    for i, hit in enumerate(response["hits"]["hits"]):
        item = hit["_source"]
        score = round((hit["_score"] / max_score), 4)
        rank = i + 1

        ingredients = item.get("RecipeIngredientParts", [])
        if isinstance(ingredients, list):
            ingredients_str = ", ".join(ingredients)
        else:
            ingredients_str = str(ingredients).replace(" ", ", ")

        # 4. ดึง Highlight มาแสดงผล
        snippet = ""
        if "highlight" in hit and "RecipeInstructions_clean" in hit["highlight"]:
            snippet = hit["highlight"]["RecipeInstructions_clean"][0]

        display_text = (
            f"Rank {rank} | Score: {score}\n"
            f"Recipe name: {item.get('Name', 'Unknown')}\n"
            f"Total time: {item.get('TotalTime', 'Unknown')}\n"
            f"Category: {item.get('RecipeCategory', 'Uncategorized')}\n"
            f"Ingredients: {ingredients_str}\n"
        )
        # ถ้ามี Highlight ให้โชว์ด้วย
        if snippet:
            display_text += f"Snippet: ...{snippet}...\n"

        display_text += "-"*60

        print(display_text)

        item["Score"] = score
        item["Rank"] = rank
        hits.append(item)

    return hits
