import os
import pandas as pd
import datetime
import requests  
import time
import sys
from kaggle.api.kaggle_api_extended import KaggleApi
from pymongo import MongoClient

# --- ΡΥΘΜΙΣΕΙΣ BΑΣΗΣ ---
MONGO_URI = "mongodb+srv://Giorgos:root@cluster0.c940dbb.mongodb.net/?appName=Cluster0"
DB_NAME = "CourseDB"
COLLECTION_NAME = "courses"

# Σύνδεση με MongoDB (Γίνεται μία φορά έξω από τις συναρτήσεις)
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# ==========================================
# ΛΕΙΤΟΥΡΓΙΑ 1: HARVEST EDX (Από Kaggle CSV)
# ==========================================
def harvest_edx():
    DATASET = "imuhammad/edx-courses"
    DOWNLOAD_PATH = "./data"
    
    try:
        api = KaggleApi()
        api.authenticate()
        api.dataset_download_files(DATASET, path=DOWNLOAD_PATH, unzip=True)
        
        csv_file = None
        for file in os.listdir(DOWNLOAD_PATH):
            if file.endswith(".csv") and "edx" in file.lower():
                csv_file = os.path.join(DOWNLOAD_PATH, file)
                break
        
        if not csv_file:
            return

        df = pd.read_csv(csv_file)
        df = df.fillna("")
        
        count = 0
        for index, row in df.iterrows():
            course_data = {
                "title": row.get("title"),
                "description": row.get("course_description") or row.get("summary"),
                "category": row.get("subject"),
                "level": row.get("Level"),
                "original_url": row.get("course_url"),
                "source_repository": "edX",
                "language": row.get("language") or "en",
                "last_updated": datetime.datetime.now(),
                "cluster": None
            }
            
            if save_to_mongo(course_data):
                count += 1
                
        
    except Exception as e:
        print("FAILED TO HARVEST EDX:", str(e))

# ==========================================
# ΛΕΙΤΟΥΡΓΙΑ 2: HARVEST COURSERA (Από Hugging Face API)
# ==========================================
def harvest_coursera():
    
    # Το βασικό URL χωρίς τις παραμέτρους
    base_url = "https://datasets-server.huggingface.co/rows"
    params = {
        "dataset": "azrai99/coursera-course-dataset",
        "config": "default",
        "split": "train",
        "offset": 0,
        "length": 100 # Παίρνουμε 100 τη φορά
    }
    
    total_count = 0
    has_more_data = True
    
    while has_more_data:
        try:
            response = requests.get(base_url, params=params)
            
            if response.status_code != 200:
                break
                
            data = response.json()
            rows = data.get("rows", [])
            
            if not rows:
                has_more_data = False
                break
                
            # Επεξεργασία των 100 εγγραφών
            for item in rows:
                row = item["row"] # Τα δεδομένα είναι μέσα στο κλειδί "row"
                
                # Mapping (Προσαρμογή στα δικά μας πεδία)
                course_data = {
                    "title": row.get("title"),
                    "skills": row.get("Skills"),
                    "description": row.get("Description") or row.get("Course Name"),
                    "category": "General", # Το συγκεκριμένο dataset ίσως δεν έχει category, βάζουμε General
                    "level": row.get("Level"),
                    "original_url": row.get("URL"),
                    "source_repository": "Coursera",
                    "language": "en", # Υποθέτουμε αγγλικά
                    "last_updated": datetime.datetime.now(),
                    "cluster": None
                }
                
                if save_to_mongo(course_data):
                    total_count += 1
            
            # Προετοιμασία για την επόμενη σελίδα
            params["offset"] += 100
            time.sleep(3) # Μικρή καθυστέρηση για να μην "θυμώσει" το API
            
        except Exception as e:
            break
            

# ==========================================
# ΒΟΗΘΗΤΙΚΗ ΣΥΝΑΡΤΗΣΗ ΑΠΟΘΗΚΕΥΣΗΣ
# ==========================================
def save_to_mongo(data):
    # Αποθηκεύουμε μόνο αν υπάρχει τίτλος και URL
    if data["title"] and data["original_url"]:
        collection.update_one(
            {"original_url": data["original_url"]},
            {"$set": data},
            upsert=True
        )
        return True
    return False

# ==========================================
# MAIN EXECUTION
# ==========================================
if __name__ == "__main__":
    # Check if an argument is provided
    if len(sys.argv) > 1:
        source = sys.argv[1].lower()
        
        if source == "edx":
            harvest_edx()
        elif source == "coursera":
            harvest_coursera()
        else:
            print(f"Unknown source: {source}")

        print("Harvesting completed.")
    else:
        print("No source provided. Usage: python script.py [edx|coursera]")
