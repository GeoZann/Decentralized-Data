from pyspark.sql.functions import coalesce, lit, col, regexp_replace
from pyspark.ml.feature import Tokenizer, StopWordsRemover, HashingTF, IDF
from pyspark.ml.clustering import BisectingKMeans
from pyspark.ml import Pipeline
from sparkLoad import load_df, save_df


def df_cluster(df):
    # 1. Ενοποίηση των πεδίων 'skills' και 'category'
    df_unified = df.withColumn(
        "clustering_text_raw",
        coalesce(col("skills"), col("category"), lit(""))
    )

    df_cleaned = df_unified.withColumn(
        "clustering_text_cleaned",
        regexp_replace(col("clustering_text_raw"), "[^a-zA-Z0-9\\s]", "")
    )

    # 2. Δημιουργία Pipeline Προεπεξεργασίας Κειμένου και Μετατροπής σε Διανύσματα (TF-IDF)
    # Βήμα 1: Tokenizer (Σπάσιμο του κειμένου σε λέξεις)
    tokenizer = Tokenizer(inputCol="clustering_text_cleaned", outputCol="words")  # Άλλαξε το inputCol

    # Βήμα 2: StopWordsRemover
    stopwords_remover = StopWordsRemover(inputCol="words", outputCol="filtered_words")

    # Βήμα 3: HashingTF
    hashing_tf = HashingTF(inputCol="filtered_words", outputCol="raw_features", numFeatures=2000)

    # Βήμα 4: IDF
    idf = IDF(inputCol="raw_features", outputCol="features")

    # Δημιουργία του Pipeline
    fe_pipeline = Pipeline(stages=[tokenizer, stopwords_remover, hashing_tf, idf])

    # Εφαρμογή του Pipeline στα δεδομένα
    pipeline_model = fe_pipeline.fit(df_cleaned)  # Χρησιμοποιούμε το df_cleaned
    df_features = pipeline_model.transform(df_cleaned)

    # 3. Εφαρμογή Αλγορίθμου K-Means Clustering
    K = 20
    bkm = BisectingKMeans(featuresCol="features", k=K, seed=1)

    print(f"Εκτελώ K-Means με K={K} συστάδες...")
    model = bkm.fit(df_features)
    predictions = model.transform(df_features)

    df_results = predictions.withColumn(
        "cluster",
        col("prediction")
    )

    df_results = df_results.drop("clustering_text_cleaned", "prediction", "clustering_text_raw", "words", "filtered_words",
                                 "raw_features", "features")

    return df_results


if __name__ == "__main__":
    spark, df = load_df("courses")

    df_results = df_cluster(df)

    print("Η ομαδοποίηση ολοκληρώθηκε.")
    df_results.show(truncate=50)

    save_df(spark, df_results, "courses")
