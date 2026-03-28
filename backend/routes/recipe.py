from flask import Blueprint, jsonify, request
from elasticsearch import Elasticsearch
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

recipe_bp = Blueprint("recipe", __name__)

INDEX_NAME = "cyosojvp_recipes"
es = Elasticsearch("http://localhost:9200")


@recipe_bp.route("/recipes/random", methods=["GET"])
def get_random_recipes():
    try:
        size = int(request.args.get("size", 8))

        body = {
            "size": size,
            "query": {
                "function_score": {
                    "query": {"match_all": {}},
                    "random_score": {}
                }
            }
        }

        res = es.search(index=INDEX_NAME, body=body)

        results = []
        for hit in res["hits"]["hits"]:
            doc = hit["_source"]

            results.append({
                "recipe_id": doc.get("recipe_id"),

                # ชื่อหลักที่ frontend อ่านได้
                "Name": doc.get("Name") or doc.get("name"),
                "RecipeCategory": doc.get("RecipeCategory") or doc.get("category"),
                "RecipeIngredientParts": doc.get("RecipeIngredientParts") or doc.get("ingredients") or [],
                "RecipeInstructions": doc.get("RecipeInstructions") or doc.get("instructions") or [],
                "Images": doc.get("Images") or doc.get("image") or doc.get("RecipeImage") or "",

                # เผื่อบางหน้าอื่นใช้ชื่อแบบ lowercase
                "name": doc.get("Name") or doc.get("name"),
                "category": doc.get("RecipeCategory") or doc.get("category"),
                "ingredient_parts": doc.get("RecipeIngredientParts") or doc.get("ingredients") or [],
                "instructions": doc.get("RecipeInstructions") or doc.get("instructions") or [],
                "image_url": doc.get("Images") or doc.get("image") or doc.get("RecipeImage") or "",
            })

        return jsonify(results), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500