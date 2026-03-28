import pandas as pd
import pickle
from pathlib import Path
from elasticsearch import Elasticsearch, helpers
import numpy as np
from tqdm import tqdm

class CyosojvpIndexer:
    def __init__(self):
        self.data_path = Path('../../resources/cleaned_ready_for_es.pkl')
        print(f"📥 กำลังโหลดข้อมูลจาก {self.data_path} ...")
        with open(self.data_path, 'rb') as f:
            self.df = pickle.load(f)

        self.es_client = Elasticsearch(
            "http://localhost:9200",
        )
        self.index_name = 'cyosojvp_recipes'

    def create_index_with_mapping(self):
        self.es_client.options(ignore_status=[400, 404]).indices.delete(index=self.index_name)

        mapping = {
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
                "analysis": {
                    "analyzer": {
                        "english_analyzer": {
                            "type": "english"
                        }
                    }
                }
            },
            "mappings": {
                "properties": {
                    "RecipeId": {"type": "keyword"},
                    "Name_clean": {
                        "type": "text",
                        "analyzer": "english_analyzer",
                        "fields": {
                            "keyword": {"type": "keyword"}  # ✅ เพิ่มตรงนี้
                        }
                    },
                    "RecipeIngredientParts_clean": {"type": "text", "analyzer": "english_analyzer"},
                    "RecipeInstructions_clean": {"type": "text", "analyzer": "english_analyzer"},
                    "RecipeCategory": {"type": "keyword"},
                    "Keywords": {"type": "text"},
                    "Images": {"type": "keyword", "index": False},
                    "Description": {"type": "text", "index": False},
                    "RecipeIngredientQuantities": {"type": "text", "index": False},
                    "AggregatedRating": {"type": "float"},
                    "ReviewCount": {"type": "integer"},
                    "TotalTime": {"type": "keyword"}
                }
            }
        }

        self.es_client.indices.create(index=self.index_name, body=mapping)
        print(f"✅ สร้าง Index '{self.index_name}' พร้อมตั้งค่า Analyzer เรียบร้อย!")

    def generate_actions(self):
        df_clean = self.df.replace({np.nan: None})
        records = df_clean.to_dict(orient='records')

        for row in tqdm(records, desc="⚡ กำลังอัปโหลดขึ้น Elasticsearch", unit=" เมนู", colour="green"):
            yield {
                "_index": self.index_name,
                "_id": str(row["RecipeId"]),
                "_source": row
            }

    def run_indexer(self):
        if not self.es_client.ping():
            print("❌ ไม่สามารถเชื่อมต่อ Elasticsearch ได้ โปรดตรวจสอบเซิร์ฟเวอร์และรหัสผ่าน")
            return

        print("🚀 กำลังเตรียมสร้าง Index...")
        self.create_index_with_mapping()

        print(f"📦 เริ่มกระบวนการส่งข้อมูล {len(self.df):,} เมนู...")

        success, failed = helpers.bulk(
            self.es_client,
            self.generate_actions(),
            chunk_size=2000,
            stats_only=True,
            raise_on_error=False
        )

        print(f"🎉 เสร็จสมบูรณ์! ยิงเข้า Database สำเร็จ {success:,} รายการ | ล้มเหลว {failed} รายการ")

if __name__ == "__main__":
    indexer = CyosojvpIndexer()
    indexer.run_indexer()