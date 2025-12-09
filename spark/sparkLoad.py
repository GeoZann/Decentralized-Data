from pyspark.sql import SparkSession


def load_df(collection):
    MONGO_URI = "mongodb+srv://Giorgos:root@cluster0.c940dbb.mongodb.net"
    DB_NAME = "CourseDB"
    COLLECTION_NAME = collection

    # Το πλήρες όνομα της συλλογής για ανάγνωση
    MONGO_READ_URI = f"{MONGO_URI}/{DB_NAME}.{COLLECTION_NAME}"

    # --- 2. Εκκίνηση Spark Session ---
    MONGO_CONNECTOR_PACKAGE = "org.mongodb.spark:mongo-spark-connector_2.12:3.0.1"

    spark = SparkSession.builder \
        .appName("MongoDBCourseLoader") \
        .config("spark.jars.packages", MONGO_CONNECTOR_PACKAGE) \
        .config("spark.mongodb.input.uri", MONGO_READ_URI) \
        .getOrCreate()

    # --- 3. Φόρτωση Δεδομένων σε DataFrame ---
    print("✅ Φορτώνω δεδομένα από το MongoDB...")

    df = spark.read.format("mongo") \
        .option("uri", MONGO_READ_URI) \
        .load()

    return spark, df


def save_df(df, collection, update_keys="_id", mode="append"):
    MONGO_URI = "mongodb+srv://Giorgos:root@cluster0.c940dbb.mongodb.net"
    DB_NAME = "CourseDB"
    COLLECTION_NAME = collection

    # Το πλήρες όνομα της συλλογής για ανάγνωση
    MONGO_WRITE_URI = f"{MONGO_URI}/{DB_NAME}.{COLLECTION_NAME}"

    try:
        df.write.format("mongo") \
            .mode(mode) \
            .option("uri", MONGO_WRITE_URI) \
            .option("spark.mongodb.output.uri", MONGO_WRITE_URI) \
            .option("replaceDocument", "false") \
            .option("spark.mongodb.output.upsert.enabled", "true") \
            .option("spark.mongodb.output.write.update.keys", ",".join(update_keys)) \
            .save()
        print("✅ Η λειτουργία Upsert/Update ολοκληρώθηκε με επιτυχία.")

    except Exception as e:

        print(f"❌ Σφάλμα κατά την αποθήκευση/ενημέρωση στο MongoDB: {e}")
