from pyspark.ml.feature import (
    Tokenizer,
    StopWordsRemover,
    HashingTF,
    IDF,
    BucketedRandomProjectionLSH,
    Normalizer
)
from pyspark.ml import Pipeline
from pyspark.sql.functions import col, collect_list, struct, row_number, lit
from pyspark.sql.window import Window
from sparkLoad import load_df, save_df


def df_find_similar(df, input_col="description"):
    # 1. Αφαίρεση κενών
    df_cleaned = df.na.fill({input_col: ""})

    # 2. Δημιουργία Pipeline Προεπεξεργασίας Κειμένου και Μετατροπής σε Διανύσματα (TF-IDF)
    # Βήμα 1: Tokenizer
    tokenizer = Tokenizer(inputCol=input_col, outputCol="words")

    # Βήμα 2: StopWordsRemover
    remover = StopWordsRemover(inputCol="words", outputCol="filtered_words")

    # Βήμα 3: HashingTF
    hashingTF = HashingTF(
        inputCol="filtered_words",
        outputCol="raw_tf",
        numFeatures=1 << 16  # 65,536 features
    )

    # Βήμα 4: IDF
    idf = IDF(inputCol="raw_tf", outputCol="idf_features")

    # Βήμα 5: Normalizer
    normalizer = Normalizer(inputCol="idf_features", outputCol="features", p=2.0)

    # Δημιουργία του Pipeline
    pipeline = Pipeline(stages=[tokenizer, remover, hashingTF, idf, normalizer])

    # Εφαρμογή του Pipeline στα δεδομένα
    model = pipeline.fit(df_cleaned)
    tfidf_df = model.transform(df_cleaned)

    # 3. Εφαρμογή LSH για μείωση μνήμης
    doc_vectors = tfidf_df.select(
        col("_id"),
        col("features")
    )

    lsh = BucketedRandomProjectionLSH(
        inputCol="features",
        outputCol="hashes",
        bucketLength=0.1,
        numHashTables=5
    )

    lsh_model = lsh.fit(doc_vectors)

    # 5. Similarity Join
    print("Υπολογίζω ομοιότητα...")

    similar_df = lsh_model.approxSimilarityJoin(
        doc_vectors,
        doc_vectors,
        threshold=1.2,
        distCol="euclidean_dist"
    ).filter(col("datasetA._id") != col("datasetB._id"))

    similarity_with_score = similar_df.withColumn(
        "similarity_score",
        1.0 - (col("euclidean_dist") ** 2 / 2.0)
    )

    windowSpec = Window.partitionBy("datasetA._id").orderBy(col("similarity_score").desc())

    top5_df = similarity_with_score.withColumn(
        "rank",
        row_number().over(windowSpec)
    ).filter(col("rank") <= 5)

    df_results = top5_df.groupBy(
        col("datasetA._id").alias("_id")
    ).agg(
        collect_list(
            struct(
                col("datasetB._id").alias("similar_doc_id"),
                col("similarity_score")
            )
        ).alias("top_5_similar_docs")
    )

    return df_results


if __name__ == "__main__":
    spark, df = load_df("courses")

    df_results = df_find_similar(df, "description")

    save_df(spark, df_results, "course_similarity", "_id", "append")
