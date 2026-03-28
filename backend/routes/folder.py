from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from config.db import db
from models.folder import Folder

folder_bp = Blueprint("folder", __name__)


@folder_bp.route("/folders", methods=["GET"])
@jwt_required()
def get_folders():
    user_id = int(get_jwt_identity())

    folders = Folder.query.filter_by(user_id=user_id).order_by(Folder.folder_id.asc()).all()

    return jsonify([folder.to_dict() for folder in folders]), 200


@folder_bp.route("/folders", methods=["POST"])
@jwt_required()
def create_folder():
    user_id = int(get_jwt_identity())
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