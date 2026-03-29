from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from services.recommender import RecommenderService
from models.bookmark import Bookmark
from models.folder import Folder

recommendation_bp = Blueprint("recommendation", __name__)
recommender = RecommenderService()


@recommendation_bp.route("/recommendations", methods=["GET"])
@jwt_required()
def get_recommendations():
    errors = []

    identity = get_jwt_identity()

    try:
        user_id = identity
        if isinstance(identity, dict):
            user_id = identity.get("user_id") or identity.get("id")
        user_id = int(user_id)
    except Exception as e:
        return jsonify({
            "error": f"Invalid JWT identity: {str(e)}",
            "all_folders": [],
            "selected_folder_recommendations": [],
            "random": [],
            "selected_folder": {
                "folder_id": None,
                "folder_name": None
            }
        }), 500

    folder_id = request.args.get("folder_id", type=int)

    all_folder_recommendations = []
    selected_folder_recommendations = []
    random_recommendations = []
    selected_folder = {
        "folder_id": None,
        "folder_name": None
    }

    try:
        all_bookmarks = Bookmark.query.filter_by(user_id=user_id).all()
        all_recipe_ids = [bookmark.recipe_id for bookmark in all_bookmarks]

        all_folder_recommendations = recommender.recommend_from_recipe_ids(
            all_recipe_ids,
            limit=8
        )
    except Exception as e:
        errors.append(f"all_folders: {str(e)}")

    try:
        if folder_id and folder_id > 0:
            folder = Folder.query.filter_by(
                folder_id=folder_id,
                user_id=user_id
            ).first()

            if folder:
                selected_folder = {
                    "folder_id": folder.folder_id,
                    "folder_name": folder.folder_name
                }

                folder_bookmarks = Bookmark.query.filter_by(
                    user_id=user_id,
                    folder_id=folder_id
                ).all()
                folder_recipe_ids = [bookmark.recipe_id for bookmark in folder_bookmarks]

                selected_folder_recommendations = recommender.recommend_from_recipe_ids(
                    folder_recipe_ids,
                    limit=8
                )
    except Exception as e:
        errors.append(f"selected_folder: {str(e)}")

    try:
        random_recommendations = recommender.get_random_recipes(limit=8)
    except Exception as e:
        errors.append(f"random: {str(e)}")

    status_code = 200 if not errors else 206

    return jsonify({
        "all_folders": all_folder_recommendations,
        "selected_folder_recommendations": selected_folder_recommendations,
        "random": random_recommendations,
        "selected_folder": selected_folder,
        "debug_errors": errors
    }), status_code