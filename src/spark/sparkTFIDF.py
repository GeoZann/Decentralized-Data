from pyspark.ml.feature import Tokenizer, HashingTF, IDF, BucketedRandomProjectionLSH
from pyspark.sql.functions import col, collect_list, struct, row_number
from pyspark.sql.window import Window
from sparkLoad import load_df, save_df


def df_find_similar(df, input_col="description"):
    # 1. Clean nulls
    df_cleaned = df.na.fill({input_col: ""})

    # 2. Tokenization
    tokenizer = Tokenizer(inputCol=input_col, outputCol="words")
    words_df = tokenizer.transform(df_cleaned)

    # 3. TF
    hashingTF = HashingTF(
        inputCol="words",
        outputCol="rawFeatures",
        numFeatures=1 << 12
    )
    tf_df = hashingTF.transform(words_df)

    # 4. IDF
    idf = IDF(inputCol="rawFeatures", outputCol="features")  # Χρησιμοποιούμε 'features' ως τελικό output
    idf_model = idf.fit(tf_df)
    tfidf_df = idf_model.transform(tf_df)


    # 5. Use the 'features' vectors directly
    doc_vectors = tfidf_df.select(
        col("_id"),
        col("features")  # Χρησιμοποιούμε τα features (από IDF)
    )

    # 6. LSH
    lsh = BucketedRandomProjectionLSH(
        inputCol="features",
        outputCol="hashes",
        bucketLength=2.5,
        numHashTables=5
    )
    lsh_model = lsh.fit(doc_vectors)

    # 7. Similarity Join
    similar_df = lsh_model.approxSimilarityJoin(
        doc_vectors,
        doc_vectors,
        threshold=20.0,
        distCol="distance"
    ).filter(col("datasetA._id") != col("datasetB._id"))

    # 8. Ranking top 5
    windowSpec = Window.partitionBy("datasetA._id").orderBy(col("distance"))

    top5_df = similar_df.withColumn(
        "rank",
        row_number().over(windowSpec)
    ).filter(col("rank") <= 5)

    # 9. Group results
    df_results  = top5_df.groupBy(
        col("datasetA._id").alias("_id")
    ).agg(
        collect_list(
            struct(
                col("datasetB._id").alias("similar_doc_id"),
                col("distance")
            )
        ).alias("top_5_similar_docs")
    )

    print("✅ Similarity computation finished WITHOUT Normalizer")

    # df_results .show(truncate=50)

    return df_results


# --- Κύριο μέρος του script ---
if __name__ == "__main__":
    spark, df = load_df("courses")

    df_results = df_find_similar(df, "description")

    save_df(spark, df_results, "course_similarity", "_id", "overwrite")
