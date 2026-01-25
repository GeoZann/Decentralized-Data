from pyspark.ml.feature import Tokenizer, StopWordsRemover, HashingTF, IDF, BucketedRandomProjectionLSH
from pyspark.ml import Pipeline
from pyspark.sql.functions import col, collect_list, struct, row_number
from pyspark.sql.window import Window
from sparkLoad import load_df, save_df


def df_find_similar(df, input_col="description"):
    # 1. Clean nulls
    df_cleaned = df.na.fill({input_col: ""})

    # 2. Create Preprocessing Pipeline (TF-IDF)
    # Stage 1: Tokenizer
    tokenizer = Tokenizer(inputCol=input_col, outputCol="words")

    # Stage 2: StopWordsRemover
    remover = StopWordsRemover(inputCol="words", outputCol="filtered_words")

    # Stage 3: HashingTF
    # Note: Changed inputCol to 'filtered_words' to actually use the result of Stage 2
    hashingTF = HashingTF(
        inputCol="filtered_words",
        outputCol="rawFeatures",
        numFeatures=1 << 12
    )

    # Stage 4: IDF
    idf = IDF(inputCol="rawFeatures", outputCol="features")

    # Create the Pipeline
    pipeline = Pipeline(stages=[tokenizer, remover, hashingTF, idf])

    # Fit and Transform
    model = pipeline.fit(df_cleaned)
    tfidf_df = model.transform(df_cleaned)

    # 3. Prepare Data for LSH
    doc_vectors = tfidf_df.select(
        col("_id"),
        col("features")
    )

    # 4. LSH (Locality Sensitive Hashing)
    lsh = BucketedRandomProjectionLSH(
        inputCol="features",
        outputCol="hashes",
        bucketLength=2.5,
        numHashTables=5
    )

    lsh_model = lsh.fit(doc_vectors)

    # 5. Similarity Join
    print("✅ Υπολογίζω Όμοια...")
    similar_df = lsh_model.approxSimilarityJoin(
        doc_vectors,
        doc_vectors,
        threshold=30.0,
        distCol="distance"
    ).filter(col("datasetA._id") != col("datasetB._id"))

    # 6. Ranking top 5
    windowSpec = Window.partitionBy("datasetA._id").orderBy(col("distance"))

    top5_df = similar_df.withColumn(
        "rank",
        row_number().over(windowSpec)
    ).filter(col("rank") <= 5)

    # 7. Group results
    df_results = top5_df.groupBy(
        col("datasetA._id").alias("_id")
    ).agg(
        collect_list(
            struct(
                col("datasetB._id").alias("similar_doc_id"),
                col("distance")
            )
        ).alias("top_5_similar_docs")
    )

    return df_results


# --- Κύριο μέρος του script ---
if __name__ == "__main__":
    spark, df = load_df("courses")

    df_results = df_find_similar(df, "description")

    save_df(spark, df_results, "course_similarity", "_id", "append")
