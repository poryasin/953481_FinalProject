from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.recommender import RecommenderService

from config.db import db
from models.folder import Folder
from models.bookmark import Bookmark

folder_bp = Blueprint("folder", __name__)
recommender = RecommenderService()


def get_current_user_id():
    identity = get_jwt_identity()

    try:
        user_id = identity
        if isinstance(identity, dict):
            user_id = identity.get("user_id") or identity.get("id")
        return int(user_id)
    except Exception:
        return None


@folder_bp.route("/folders", methods=["GET"])
@jwt_required()
def get_folders():
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid user identity"}), 401

    folders = (
        Folder.query
        .filter_by(user_id=user_id)
        .order_by(Folder.folder_id.asc())
        .all()
    )

    return jsonify([folder.to_dict() for folder in folders]), 200


@folder_bp.route("/folders", methods=["POST"])
@jwt_required()
def create_folder():
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid user identity"}), 401

    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    folder_name = str(data.get("folder_name", "")).strip()

    if not folder_name:
        return jsonify({"error": "folder_name is required"}), 400

    existing_folder = Folder.query.filter_by(
        user_id=user_id,
        folder_name=folder_name
    ).first()

    if existing_folder:
        return jsonify({"error": "Folder already exists"}), 409

    new_folder = Folder(
        user_id=user_id,
        folder_name=folder_name
    )

    db.session.add(new_folder)
    db.session.commit()

    return jsonify({
        "message": "Folder created successfully",
        "folder": new_folder.to_dict()
    }), 201


@folder_bp.route("/folders/<int:folder_id>/bookmarks", methods=["GET"])
@jwt_required()
def get_folder_bookmarks(folder_id):
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid user identity"}), 401

    folder = Folder.query.filter_by(folder_id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify({"error": "Folder not found"}), 404

    bookmarks = (
        Bookmark.query
        .filter_by(user_id=user_id, folder_id=folder_id)
        .order_by(Bookmark.bookmark_id.desc())
        .all()
    )

    return jsonify([bookmark.to_dict() for bookmark in bookmarks]), 200


@folder_bp.route("/folders/<int:folder_id>/recommendations", methods=["GET"])
@jwt_required()
def get_folder_recommendations(folder_id):
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid user identity"}), 401

    folder = Folder.query.filter_by(folder_id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify({"error": "Folder not found"}), 404

    folder_bookmarks = Bookmark.query.filter_by(
        user_id=user_id,
        folder_id=folder_id
    ).all()

    folder_recipe_ids = [
        bookmark.recipe_id
        for bookmark in folder_bookmarks
        if bookmark.recipe_id
    ]

    if not folder_recipe_ids:
        return jsonify({
            "recommendations": [],
            "selected_folder": {
                "folder_id": folder.folder_id,
                "folder_name": folder.folder_name
            }
        }), 200

    try:
        recommendations = recommender.recommend_from_recipe_ids(
            folder_recipe_ids,
            limit=8
        )

        return jsonify({
            "recommendations": recommendations,
            "selected_folder": {
                "folder_id": folder.folder_id,
                "folder_name": folder.folder_name
            }
        }), 200

    except Exception as e:
        return jsonify({
            "error": f"Failed to fetch recommendations: {str(e)}",
            "recommendations": [],
            "selected_folder": {
                "folder_id": folder.folder_id,
                "folder_name": folder.folder_name
            }
        }), 500


@folder_bp.route("/folders/<int:folder_id>", methods=["DELETE"])
@jwt_required()
def delete_folder(folder_id):
    user_id = get_current_user_id()
    if user_id is None:
        return jsonify({"error": "Invalid user identity"}), 401

    folder = Folder.query.filter_by(folder_id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify({"error": "Folder not found"}), 404

    Bookmark.query.filter_by(user_id=user_id, folder_id=folder_id).delete()

    db.session.delete(folder)
    db.session.commit()

    return jsonify({
        "message": "Folder deleted successfully",
        "folder_id": folder_id
    }), 200