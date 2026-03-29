from flask import Blueprint, jsonify, request
from elasticsearch import Elasticsearch
import urllib3
from flask_jwt_extended import jwt_required, get_jwt_identity

from config.db import db
from models.folder import Folder
from models.bookmark import Bookmark
from services.recommender import RecommenderService

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

recipe_bp = Blueprint("recipe", __name__)
folder_bp = Blueprint("folder", __name__)
recommender = RecommenderService()

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

@folder_bp.route("/folders/<int:folder_id>/recommendations", methods=["GET"])
@jwt_required()
def get_folder_recommendations(folder_id):
    identity = get_jwt_identity()

    try:
        user_id = identity
        if isinstance(identity, dict):
            user_id = identity.get("user_id") or identity.get("id")
        user_id = int(user_id)
    except Exception:
        return jsonify({"error": "Invalid user identity"}), 401

    folder = Folder.query.filter_by(folder_id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify({"error": "Folder not found"}), 404

    bookmarks = Bookmark.query.filter_by(user_id=user_id, folder_id=folder_id).all()
    recipe_ids = [bookmark.recipe_id for bookmark in bookmarks]

    recommendations = recommender.recommend_from_recipe_ids(recipe_ids, limit=8)

    return jsonify({
        "folder": {
            "folder_id": folder.folder_id,
            "folder_name": folder.folder_name
        },
        "recommendations": recommendations
    }), 200
