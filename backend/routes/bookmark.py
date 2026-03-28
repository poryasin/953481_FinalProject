from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from elasticsearch import Elasticsearch

from config.db import db
from models.bookmark import Bookmark


bookmark_bp = Blueprint("bookmark", __name__)

INDEX_NAME = "cyosojvp_recipes"

es = Elasticsearch("http://localhost:9200")


def serialize_bookmark_with_recipe(bookmark, recipe_data=None):
    recipe_data = recipe_data or {}

    return {
        "bookmark_id": bookmark.bookmark_id,
        "user_id": bookmark.user_id,
        "folder_id": bookmark.folder_id,
        "recipe_id": bookmark.recipe_id,
        "rating": bookmark.rating,
        "created_at": bookmark.created_at.isoformat() if bookmark.created_at else None,
        "Name": recipe_data.get("Name"),
        "RecipeCategory": recipe_data.get("RecipeCategory"),
        "Images": recipe_data.get("Images"),
        "TotalTime": recipe_data.get("TotalTime"),
        "RecipeIngredientParts": recipe_data.get("RecipeIngredientParts"),
        "RecipeInstructions": recipe_data.get("RecipeInstructions"),
    }


def get_recipes_map_from_es(recipe_ids):
    if not recipe_ids:
        return {}

    try:
        unique_recipe_ids = list({int(rid) for rid in recipe_ids if rid is not None})

        response = es.search(
            index=INDEX_NAME,
            body={
                "size": len(unique_recipe_ids),
                "query": {
                    "terms": {
                        "RecipeId": unique_recipe_ids
                    }
                }
            }
        )

        recipe_map = {}
        hits = response.get("hits", {}).get("hits", [])

        for hit in hits:
            source = hit.get("_source", {})
            recipe_id = source.get("RecipeId")

            if recipe_id is not None:
                recipe_map[int(recipe_id)] = source

        return recipe_map

    except Exception as e:
        print("Elasticsearch bulk fetch error:", e)
        return {}


@bookmark_bp.route("/bookmarks", methods=["POST"])
@jwt_required()
def create_bookmark():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    recipe_id = data.get("recipe_id")
    folder_id = data.get("folder_id")
    rating = data.get("rating")

    if not recipe_id or not folder_id:
        return jsonify({"error": "recipe_id and folder_id required"}), 400

    try:
        recipe_id = int(recipe_id)
        folder_id = int(folder_id)
    except (TypeError, ValueError):
        return jsonify({"error": "recipe_id and folder_id must be integers"}), 400

    if rating is not None:
        try:
            rating = int(rating)
        except (TypeError, ValueError):
            return jsonify({"error": "rating must be an integer"}), 400

    new_bookmark = Bookmark(
        user_id=user_id,
        recipe_id=recipe_id,
        folder_id=folder_id,
        rating=rating,
        created_at=datetime.utcnow(),
    )

    db.session.add(new_bookmark)
    db.session.commit()

    return jsonify({"message": "Bookmarked successfully"}), 201


@bookmark_bp.route("/bookmarks", methods=["GET"])
@jwt_required()
def get_bookmarks():
    user_id = get_jwt_identity()

    bookmarks = (
        Bookmark.query
        .filter_by(user_id=user_id)
        .order_by(Bookmark.created_at.desc())
        .all()
    )

    recipe_ids = [bookmark.recipe_id for bookmark in bookmarks]
    recipe_map = get_recipes_map_from_es(recipe_ids)

    results = []

    for bookmark in bookmarks:
        recipe_data = recipe_map.get(int(bookmark.recipe_id), {})
        results.append(serialize_bookmark_with_recipe(bookmark, recipe_data))

    return jsonify(results), 200


@bookmark_bp.route("/bookmarks/<int:bookmark_id>", methods=["DELETE"])
@jwt_required()
def delete_bookmark(bookmark_id):
    user_id = get_jwt_identity()

    bookmark = Bookmark.query.filter_by(
        bookmark_id=bookmark_id,
        user_id=user_id
    ).first()

    if not bookmark:
        return jsonify({"error": "Bookmark not found"}), 404

    db.session.delete(bookmark)
    db.session.commit()

    return jsonify({"message": "Bookmark deleted successfully"}), 200

@bookmark_bp.route("/folders/<int:folder_id>/bookmarks", methods=["GET"])
@jwt_required()
def get_bookmarks_by_folder(folder_id):
    user_id = get_jwt_identity()

    bookmarks = (
        Bookmark.query
        .filter_by(user_id=user_id, folder_id=folder_id)
        .order_by(Bookmark.created_at.desc())
        .all()
    )

    # ดึง recipe จาก Elasticsearch
    recipe_ids = [b.recipe_id for b in bookmarks]
    recipe_map = get_recipes_map_from_es(recipe_ids)

    results = []

    for b in bookmarks:
        recipe_data = recipe_map.get(int(b.recipe_id), {})

        results.append({
            "bookmark_id": b.bookmark_id,
            "recipe_id": b.recipe_id,
            "folder_id": b.folder_id,
            "rating": b.rating,

            # 🔥 ตรงนี้คือสิ่งที่ frontend ใช้
            "Name": recipe_data.get("Name"),
            "RecipeCategory": recipe_data.get("RecipeCategory"),
            "Images": recipe_data.get("Images"),
        })

    return jsonify(results), 200