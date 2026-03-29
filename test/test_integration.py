"""
Integration Tests — full user journeys across multiple routes
รันได้ทั้ง PyCharm (unittest) และ pytest
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import unittest
from unittest.mock import patch
from flask import Flask
from flask_jwt_extended import JWTManager

from config.db import db
from routes.auth import auth_bp
from routes.bookmark import bookmark_bp
from routes.folder import folder_bp
from routes.recommendation import recommendation_bp


def create_app():
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = "integration-secret"
    db.init_app(app)
    JWTManager(app)
    app.register_blueprint(auth_bp)
    app.register_blueprint(bookmark_bp)
    app.register_blueprint(folder_bp)
    app.register_blueprint(recommendation_bp)
    return app


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def register_and_login(client, suffix):
    client.post("/register", json={
        "username": f"user_{suffix}",
        "email": f"{suffix}@example.com",
        "password": "password"
    })
    res = client.post("/login", json={
        "email": f"{suffix}@example.com",
        "password": "password"
    })
    return res.get_json()["access_token"]


# ─────────────────────────────────────────────
# Journey 1: Register → Login → /me
# ─────────────────────────────────────────────

class TestAuthJourney(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()

    def test_full_auth_flow(self):
        res = self.client.post("/register", json={
            "username": "journey_user", "email": "journey@example.com", "password": "pw"
        })
        self.assertEqual(res.status_code, 201)

        res = self.client.post("/login", json={
            "email": "journey@example.com", "password": "pw"
        })
        self.assertEqual(res.status_code, 200)
        token = res.get_json()["access_token"]

        res = self.client.get("/me", headers=auth_header(token))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["user"]["email"], "journey@example.com")


# ─────────────────────────────────────────────
# Journey 2: สร้าง Folder → Bookmark → ดู → ลบ
# ─────────────────────────────────────────────

class TestBookmarkLifecycle(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()

    @patch("routes.bookmark.get_recipes_map_from_es")
    def test_full_bookmark_flow(self, mock_es):
        mock_es.return_value = {
            42: {"Name": "Spaghetti", "RecipeCategory": "Pasta", "Images": "img.jpg"}
        }
        token = register_and_login(self.client, "bm_journey")

        # สร้าง folder
        res = self.client.post("/folders", json={"folder_name": "Italian"},
                               headers=auth_header(token))
        self.assertEqual(res.status_code, 201)
        folder_id = res.get_json()["folder"]["folder_id"]

        # Bookmark recipe
        res = self.client.post("/bookmarks", json={
            "recipe_id": 42, "folder_id": folder_id, "rating": 4
        }, headers=auth_header(token))
        self.assertEqual(res.status_code, 201)

        # ดู bookmarks
        res = self.client.get("/bookmarks", headers=auth_header(token))
        bookmarks = res.get_json()
        self.assertTrue(any(b["recipe_id"] == 42 for b in bookmarks))
        bm_id = next(b["bookmark_id"] for b in bookmarks if b["recipe_id"] == 42)

        # ลบ bookmark
        res = self.client.delete(f"/bookmarks/{bm_id}", headers=auth_header(token))
        self.assertEqual(res.status_code, 200)

        # ยืนยันว่าหายไปแล้ว
        res = self.client.get("/bookmarks", headers=auth_header(token))
        self.assertTrue(all(b["recipe_id"] != 42 for b in res.get_json()))


# ─────────────────────────────────────────────
# Journey 3: ลบ Folder ต้องลบ Bookmarks ด้วย
# ─────────────────────────────────────────────

class TestFolderCascade(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()

    @patch("routes.bookmark.get_recipes_map_from_es", return_value={})
    def test_delete_folder_removes_its_bookmarks(self, _):
        token = register_and_login(self.client, "cascade_user")

        res = self.client.post("/folders", json={"folder_name": "ToRemove"},
                               headers=auth_header(token))
        folder_id = res.get_json()["folder"]["folder_id"]

        self.client.post("/bookmarks", json={
            "recipe_id": 99, "folder_id": folder_id
        }, headers=auth_header(token))

        self.client.delete(f"/folders/{folder_id}", headers=auth_header(token))

        res = self.client.get("/bookmarks", headers=auth_header(token))
        remaining = [b for b in res.get_json() if b["folder_id"] == folder_id]
        self.assertEqual(remaining, [])


# ─────────────────────────────────────────────
# Journey 4: Recommendations
# ─────────────────────────────────────────────

class TestRecommendationsJourney(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()

    @patch("routes.recommendation.recommender")
    @patch("routes.bookmark.get_recipes_map_from_es", return_value={})
    def test_recommendations_returned_after_bookmarking(self, _, mock_rec):
        mock_rec.recommend_from_recipe_ids.return_value = [
            {"recipe_id": 200, "Name": "Recommended Dish"}
        ]
        mock_rec.get_random_recipes.return_value = []

        token = register_and_login(self.client, "rec_user")
        res = self.client.post("/folders", json={"folder_name": "MyFolder"},
                               headers=auth_header(token))
        folder_id = res.get_json()["folder"]["folder_id"]
        self.client.post("/bookmarks", json={
            "recipe_id": 10, "folder_id": folder_id
        }, headers=auth_header(token))

        res = self.client.get("/recommendations", headers=auth_header(token))
        self.assertIn(res.status_code, [200, 206])
        self.assertIn("all_folders", res.get_json())
        self.assertGreaterEqual(len(res.get_json()["all_folders"]), 1)

    @patch("routes.recommendation.recommender")
    def test_recommendations_filtered_by_folder_id(self, mock_rec):
        mock_rec.recommend_from_recipe_ids.return_value = []
        mock_rec.get_random_recipes.return_value = []

        token = register_and_login(self.client, "rec_filter")
        res = self.client.post("/folders", json={"folder_name": "FilterMe"},
                               headers=auth_header(token))
        folder_id = res.get_json()["folder"]["folder_id"]

        res = self.client.get(f"/recommendations?folder_id={folder_id}",
                              headers=auth_header(token))
        self.assertIn(res.status_code, [200, 206])
        self.assertEqual(res.get_json()["selected_folder"]["folder_id"], folder_id)


# ─────────────────────────────────────────────
# Journey 5: Data isolation ระหว่าง users
# ─────────────────────────────────────────────

class TestUserIsolation(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()

    @patch("routes.bookmark.get_recipes_map_from_es", return_value={})
    def test_users_cannot_see_each_others_data(self, _):
        token_a = register_and_login(self.client, "isolation_a")
        token_b = register_and_login(self.client, "isolation_b")

        res = self.client.post("/folders", json={"folder_name": "A_Folder"},
                               headers=auth_header(token_a))
        folder_id = res.get_json()["folder"]["folder_id"]
        self.client.post("/bookmarks", json={
            "recipe_id": 77, "folder_id": folder_id
        }, headers=auth_header(token_a))

        # User B ต้องไม่เห็น bookmark ของ User A
        res = self.client.get("/bookmarks", headers=auth_header(token_b))
        self.assertEqual(res.get_json(), [])

        # User B ต้องไม่เห็น folder ของ User A
        res = self.client.get("/folders", headers=auth_header(token_b))
        names = [f["folder_name"] for f in res.get_json()]
        self.assertNotIn("A_Folder", names)


if __name__ == "__main__":
    unittest.main()