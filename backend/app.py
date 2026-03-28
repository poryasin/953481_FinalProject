import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config.db import db
from routes.auth import auth_bp
from search.elastic_search import search_recipes
from routes.bookmark import bookmark_bp
from routes.folder import folder_bp
from routes.recipe import recipe_bp

load_dotenv()

app = Flask(__name__)
CORS(app,
     origins=["http://localhost:5173"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True
)

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL",
    "sqlite:///auth.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "change-this-secret")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=2)

db.init_app(app)
jwt = JWTManager(app)

app.register_blueprint(auth_bp)
app.register_blueprint(bookmark_bp)
app.register_blueprint(folder_bp)
app.register_blueprint(recipe_bp)

@app.route("/")
def home():
    return jsonify({"message": "IR search API (Elasticsearch) is running"})


@app.route("/search", methods=["GET"])
def search_api():
    q = request.args.get("q", "").strip()

    if not q:
        return jsonify({
            "results": [],
            "suggestions": []
        })

    try:
        results = search_recipes(q)
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    print("Starting flask...")
    app.run(debug=True, port=5000)