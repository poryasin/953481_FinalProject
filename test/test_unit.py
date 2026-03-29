"""
Unit Tests — auth, search, bookmark, folder
รันได้ทั้ง PyCharm (unittest) และ pytest
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import unittest
from unittest.mock import patch, MagicMock
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from config.db import db
from routes.auth import auth_bp
from routes.bookmark import bookmark_bp
from routes.folder import folder_bp
from models.bookmark import Bookmark
from models.folder import Folder


def create_app():
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = "test-secret"
    db.init_app(app)
    JWTManager(app)
    app.register_blueprint(auth_bp)
    app.register_blueprint(bookmark_bp)
    app.register_blueprint(folder_bp)
    return app


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

class TestRegister(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()

    def test_register_success(self):
        res = self.client.post("/register", json={
            "username": "alice", "email": "alice@example.com", "password": "secret"
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.get_json()["user"]["username"], "alice")

    def test_register_missing_fields(self):
        res = self.client.post("/register", json={"username": "bob"})
        self.assertEqual(res.status_code, 400)

    def test_register_duplicate_email(self):
        payload = {"username": "carol", "email": "carol@example.com", "password": "pw"}
        self.client.post("/register", json=payload)
        res = self.client.post("/register", json=payload)
        self.assertEqual(res.status_code, 409)

    def test_register_no_body(self):
        # Flask คืน 415 Unsupported Media Type เมื่อ Content-Type ไม่ใช่ application/json
        res = self.client.post("/register", data="not json", content_type="text/plain")
        self.assertIn(res.status_code, [400, 415])


class TestLoginAndMe(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()
        self.client.post("/register", json={
            "username": "dave", "email": "dave@example.com", "password": "pass123"
        })

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()

    def test_login_success(self):
        res = self.client.post("/login", json={
            "email": "dave@example.com", "password": "pass123"
        })
        self.assertEqual(res.status_code, 200)
        self.assertIn("access_token", res.get_json())

    def test_login_wrong_password(self):
        res = self.client.post("/login", json={
            "email": "dave@example.com", "password": "wrong"
        })
        self.assertEqual(res.status_code, 401)

    def test_login_unknown_email(self):
        res = self.client.post("/login", json={
            "email": "nobody@x.com", "password": "pw"
        })
        self.assertEqual(res.status_code, 401)

    def test_me_authenticated(self):
        token = self.client.post("/login", json={
            "email": "dave@example.com", "password": "pass123"
        }).get_json()["access_token"]
        res = self.client.get("/me", headers=auth_header(token))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["user"]["email"], "dave@example.com")

    def test_me_no_token(self):
        res = self.client.get("/me")
        self.assertEqual(res.status_code, 401)


# ─────────────────────────────────────────────
# SEARCH
# ─────────────────────────────────────────────

def _make_hit(id_, name, score=1.0, highlight=None):
    hit = {"_id": str(id_), "_score": score, "_source": {
        "RecipeId": id_, "Name_clean": name,
        "RecipeIngredientParts_clean": "flour eggs",
        "RecipeInstructions_clean": "mix and bake",
    }}
    if highlight:
        hit["highlight"] = {"RecipeInstructions_clean": [highlight]}
    return hit


def _make_es_response(hits, suggestions=None):
    options = [{"text": s} for s in (suggestions or [])]
    return {
        "hits": {"max_score": hits[0]["_score"] if hits else 1.0, "hits": hits},
        "suggest": {"spell_suggest": [{"options": options}]}
    }


class TestSearchRecipes(unittest.TestCase):
    @patch("search.elastic_search.es")
    def test_empty_query_returns_empty(self, mock_es):
        from search.elastic_search import search_recipes
        result = search_recipes("")
        self.assertEqual(result, {"results": [], "suggestions": []})
        mock_es.search.assert_not_called()

    @patch("search.elastic_search.es")
    def test_returns_ranked_results(self, mock_es):
        from search.elastic_search import search_recipes
        mock_es.search.return_value = _make_es_response([
            _make_hit(1, "Chocolate Cake", score=5.0),
            _make_hit(2, "Vanilla Cake", score=3.0),
        ])
        results = search_recipes("cake")["results"]
        self.assertEqual(results[0]["Rank"], 1)
        self.assertAlmostEqual(results[0]["Score"], 1.0)
        self.assertGreater(results[1]["Score"], 0.0)
        self.assertLess(results[1]["Score"], 1.0)

    @patch("search.elastic_search.es")
    def test_recipe_id_cast_to_int(self, mock_es):
        from search.elastic_search import search_recipes
        mock_es.search.return_value = _make_es_response([_make_hit("42", "Pasta")])
        self.assertEqual(search_recipes("pasta")["results"][0]["recipe_id"], 42)

    @patch("search.elastic_search.es")
    def test_snippet_from_highlight(self, mock_es):
        from search.elastic_search import search_recipes
        mock_es.search.return_value = _make_es_response(
            [_make_hit(1, "Soup", highlight="**simmer** for 10 minutes")]
        )
        self.assertIn("Snippet", search_recipes("soup")["results"][0])

    @patch("search.elastic_search.es")
    def test_suggestion_excluded_when_same_as_query(self, mock_es):
        from search.elastic_search import search_recipes
        mock_es.search.return_value = _make_es_response(
            [_make_hit(1, "Steak")], suggestions=["steak"]
        )
        self.assertEqual(search_recipes("steak")["suggestions"], [])

    @patch("search.elastic_search.es")
    def test_suggestion_included_when_different(self, mock_es):
        from search.elastic_search import search_recipes
        mock_es.search.return_value = _make_es_response(
            [_make_hit(1, "Bread")], suggestions=["breads"]
        )
        self.assertIn("breads", search_recipes("bread")["suggestions"])


# ─────────────────────────────────────────────
# BOOKMARK
# ─────────────────────────────────────────────

class TestBookmark(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()
        with self.app.app_context():
            self.token = create_access_token(identity="1")

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()

    @patch("routes.bookmark.get_recipes_map_from_es", return_value={})
    def test_create_success(self, _):
        res = self.client.post("/bookmarks", json={
            "recipe_id": 10, "folder_id": 1, "rating": 5
        }, headers=auth_header(self.token))
        self.assertEqual(res.status_code, 201)

    def test_create_missing_fields(self):
        res = self.client.post("/bookmarks", json={"recipe_id": 10},
                               headers=auth_header(self.token))
        self.assertEqual(res.status_code, 400)

    def test_create_invalid_ids(self):
        res = self.client.post("/bookmarks", json={
            "recipe_id": "abc", "folder_id": "xyz"
        }, headers=auth_header(self.token))
        self.assertEqual(res.status_code, 400)

    @patch("routes.bookmark.get_recipes_map_from_es")
    def test_get_bookmarks(self, mock_es):
        mock_es.return_value = {20: {"Name": "Pasta", "RecipeCategory": "Italian"}}
        with self.app.app_context():
            db.session.add(Bookmark(user_id=1, recipe_id=20, folder_id=1))
            db.session.commit()
        res = self.client.get("/bookmarks", headers=auth_header(self.token))
        self.assertEqual(res.status_code, 200)
        self.assertTrue(any(b["recipe_id"] == 20 for b in res.get_json()))

    def test_delete_success(self):
        with self.app.app_context():
            bm = Bookmark(user_id=1, recipe_id=30, folder_id=1)
            db.session.add(bm)
            db.session.commit()
            bm_id = bm.bookmark_id
        res = self.client.delete(f"/bookmarks/{bm_id}", headers=auth_header(self.token))
        self.assertEqual(res.status_code, 200)

    def test_delete_other_users_bookmark_returns_404(self):
        with self.app.app_context():
            bm = Bookmark(user_id=999, recipe_id=40, folder_id=1)
            db.session.add(bm)
            db.session.commit()
            bm_id = bm.bookmark_id
        res = self.client.delete(f"/bookmarks/{bm_id}", headers=auth_header(self.token))
        self.assertEqual(res.status_code, 404)


# ─────────────────────────────────────────────
# FOLDER
# ─────────────────────────────────────────────

class TestFolder(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()
        with self.app.app_context():
            self.token = create_access_token(identity="1")

    def tearDown(self):
        with self.app.app_context():
            db.drop_all()

    def test_create_success(self):
        res = self.client.post("/folders", json={"folder_name": "Favourites"},
                               headers=auth_header(self.token))
        self.assertEqual(res.status_code, 201)

    def test_create_duplicate(self):
        self.client.post("/folders", json={"folder_name": "Breakfast"},
                         headers=auth_header(self.token))
        res = self.client.post("/folders", json={"folder_name": "Breakfast"},
                               headers=auth_header(self.token))
        self.assertEqual(res.status_code, 409)

    def test_create_missing_name(self):
        res = self.client.post("/folders", json={}, headers=auth_header(self.token))
        self.assertEqual(res.status_code, 400)

    def test_get_folders_excludes_other_users(self):
        with self.app.app_context():
            db.session.add(Folder(user_id=999, folder_name="OtherSecret"))
            db.session.commit()
        res = self.client.get("/folders", headers=auth_header(self.token))
        names = [f["folder_name"] for f in res.get_json()]
        self.assertNotIn("OtherSecret", names)

    def test_delete_cascades_bookmarks(self):
        with self.app.app_context():
            folder = Folder(user_id=1, folder_name="ToDelete")
            db.session.add(folder)
            db.session.commit()
            folder_id = folder.folder_id
            db.session.add(Bookmark(user_id=1, recipe_id=5, folder_id=folder_id))
            db.session.commit()
        self.client.delete(f"/folders/{folder_id}", headers=auth_header(self.token))
        with self.app.app_context():
            self.assertIsNone(Folder.query.get(folder_id))
            self.assertEqual(Bookmark.query.filter_by(folder_id=folder_id).count(), 0)

    @patch("routes.folder.recommender")
    def test_empty_folder_returns_no_recommendations(self, mock_rec):
        with self.app.app_context():
            folder = Folder(user_id=1, folder_name="EmptyFolder")
            db.session.add(folder)
            db.session.commit()
            folder_id = folder.folder_id
        res = self.client.get(f"/folders/{folder_id}/recommendations",
                              headers=auth_header(self.token))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["recommendations"], [])
        mock_rec.recommend_from_recipe_ids.assert_not_called()


if __name__ == "__main__":
    unittest.main()