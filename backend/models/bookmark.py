from config.db import db

class Bookmark(db.Model):
    __tablename__ = "bookmarks"

    bookmark_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    recipe_id = db.Column(db.Integer, nullable=False)
    folder_id = db.Column(db.Integer, nullable=False)
    rating = db.Column(db.Integer)
    created_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            "bookmark_id": self.bookmark_id,
            "user_id": self.user_id,
            "recipe_id": self.recipe_id,
            "folder_id": self.folder_id,
            "rating": self.rating,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }