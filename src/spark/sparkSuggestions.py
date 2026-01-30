from pyspark.sql.functions import col, explode, desc, max as spark_max
from sparkLoad import load_df


def generate_suggestions(user_likes: list, num_suggestions=5):
    if not user_likes:
        print("Ο χρήστης δεν έχει likes. Δεν μπορούν να δημιουργηθούν προτάσεις.")
        return None

    # Φόρτωση του πίνακα ομοιότητας
    spark, similarity_df = load_df("course_similarity")

    # 1. Μετατροπή του κύριου _id από Struct σε String (όπως πριν)
    similarity_df = similarity_df.withColumn("_id", col("_id.oid"))

    # Φιλτράρισμα: Κρατάμε μόνο τα μαθήματα που ο χρήστης έχει κάνει ήδη like
    liked_courses_similarities = similarity_df.filter(
        col("_id").isin(user_likes)
    )

    # 2. Ανάπτυξη (Explode)
    exploded_suggestions = liked_courses_similarities.select(
        col("_id").alias("liked_course_id"),
        explode("top_5_similar_docs").alias("suggestion")
    )

    # 3. Προσθέτουμε το .oid στο similar_doc_id
    filtered_suggestions = exploded_suggestions.select(
        col("liked_course_id"),
        col("suggestion.similar_doc_id.oid").alias("suggested_course_id"),
        col("suggestion.similarity_score").alias("score")
    ).filter(
        ~col("suggested_course_id").isin(user_likes)
    )

    # 4. Ομαδοποίηση και εύρεση μέγιστου score
    unique_suggestions = filtered_suggestions.groupBy("suggested_course_id") \
        .agg(spark_max("score").alias("max_score"))

    # 5. Ταξινόμηση φθίνουσα (μεγαλύτερο score = καλύτερο)
    final_suggestions = unique_suggestions.orderBy(
        desc("max_score")
    ).limit(num_suggestions)

    print(f"Δημιουργήθηκαν {final_suggestions.count()} μοναδικές προτάσεις.")

    return spark, final_suggestions


if __name__ == "__main__":

    USER_LIKED_COURSE_IDS = [
        "69383d5f47b7f4d400d99804",
        "69383d6547b7f4d400d9984d",
        "69383dcd47b7f4d400d99ca1",
        "69383e2947b7f4d400d99f6c",
        "69383e2c47b7f4d400d99f8c",
        "6938402847b7f4d400d9ae6d",
        "69383d5e47b7f4d400d997fb"
    ]

    spark, suggestions_df = generate_suggestions(USER_LIKED_COURSE_IDS, num_suggestions=5)

    if suggestions_df is not None:
        print("\nΤελικές Προτάσεις:")
        suggestions_df.show(truncate=False)

    spark.stop()
