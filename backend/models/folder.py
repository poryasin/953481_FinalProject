from config.db import db
from datetime import datetime


class Folder(db.Model):
    __tablename__ = "folders"

    folder_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    folder_name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "folder_id": self.folder_id,
            "user_id": self.user_id,
            "folder_name": self.folder_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }