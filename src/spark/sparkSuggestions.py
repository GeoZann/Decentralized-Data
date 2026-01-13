from pyspark.sql.functions import col, explode, cast
from sparkLoad import load_df


def generate_suggestions(user_likes: list, num_suggestions=5):
    if not user_likes:
        print("Ο χρήστης δεν έχει likes. Δεν μπορούν να δημιουργηθούν προτάσεις.")
        return None

    # Φόρτωση του πίνακα ομοιότητας (course_similarity)
    spark, similarity_df = load_df("course_similarity")

    # Ensure the main ID is a simple string for the initial filter
    similarity_df = similarity_df.withColumn("_id", col("_id.oid"))

    # Φιλτράρισμα του πίνακα ομοιότητας ώστε να περιλαμβάνει μόνο σειρές όπου το _id
    # βρίσκεται στη λίστα των likes του χρήστη
    liked_courses_similarities = similarity_df.filter(
        col("_id").isin(user_likes)
    )

    # Αναπτύσσουμε (explode) τον πίνακα 'top_5_similar_docs' για να δημιουργήσουμε
    # μία γραμμή ανά πρόταση ομοιότητας
    exploded_suggestions = liked_courses_similarities.select(
        col("_id").alias("liked_course_id"),
        explode("top_5_similar_docs").alias("suggestion")
    )

    # --- FIX STARTS HERE ---
    # Extract the suggested course ID, distance, and cast the ID to a STRING type.
    filtered_suggestions = exploded_suggestions.select(
        col("liked_course_id"),
        col("suggestion.similar_doc_id.oid").alias("suggested_course_id"),
        col("suggestion.distance").alias("distance")
    ).filter(
        # Now 'suggested_course_id' is a simple string, matching the types in 'user_likes'
        ~col("suggested_course_id").isin(user_likes)
    )
    # --- FIX ENDS HERE ---

    # Ομαδοποίηση ανά προτεινόμενο ID μαθήματος για να βρούμε μοναδικές προτάσεις
    # και να αθροίσουμε τις αποστάσεις (παίρνουμε την ελάχιστη απόσταση ως "καλύτερη")
    # Note: Using min('distance') is correct for finding the *most* similar course from any like.
    unique_suggestions = filtered_suggestions.groupBy("suggested_course_id").min("distance")

    # Ταξινόμηση κατά την ελάχιστη απόσταση (μικρότερη απόσταση = καλύτερη ομοιότητα)
    # και περιορισμός στις κορυφαίες N
    final_suggestions = unique_suggestions.orderBy(
        col("min(distance)")
    ).limit(num_suggestions)

    print(f"✅ Δημιουργήθηκαν {final_suggestions.count()} μοναδικές προτάσεις.")
    # final_suggestions.show(truncate=False)

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
