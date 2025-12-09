from pyspark.sql.functions import coalesce, lit, col, regexp_replace
from pyspark.ml.feature import Tokenizer, StopWordsRemover, HashingTF, IDF
from pyspark.ml.clustering import BisectingKMeans
from pyspark.ml import Pipeline
from sparkLoad import load_df, save_df

# 1. Φόρτωση δεδομένων από τη συλλογή "courses" (ή όποια άλλη χρησιμοποιείτε)
spark, df = load_df("courses")

df.show(5)

# 2. Ενοποίηση των πεδίων 'skills' και 'category'
df_unified = df.withColumn(
    "clustering_text_raw",
    coalesce(col("skills"), col("category"), lit(""))
)

print("✅ Δημιουργήθηκε ενοποιημένο πεδίο κειμένου clustering_text_raw.")
df_unified.select("title", "skills", "category", "clustering_text_raw").show(truncate=50)

df_cleaned = df_unified.withColumn(
    "clustering_text_cleaned",
    regexp_replace(col("clustering_text_raw"), "[^a-zA-Z0-9\\s]", "")
)

print("✅ Αφαιρέθηκαν τα σύμβολα '&' από το κείμενο.")
df_cleaned.select("clustering_text_raw", "clustering_text_cleaned").show(truncate=50)


# 3. Δημιουργία Pipeline Προεπεξεργασίας Κειμένου και Μετατροπής σε Διανύσματα (TF-IDF)

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

print("✅ Το κείμενο μετατράπηκε σε αριθμητικά διανύσματα (features).")
df_features.select("title", "features").show(truncate=50)

# 4. Εφαρμογή Αλγορίθμου K-Means Clustering

K = 20  # Ορίστε τον επιθυμητό αριθμό συστάδων (clusters)
bkm = BisectingKMeans(featuresCol="features", k=K, seed=1)

print(f"✅ Εκτελώ K-Means με K={K} συστάδες...")
model = bkm.fit(df_features)
predictions = model.transform(df_features)

df_results = predictions.withColumn(
    "cluster",
    col("prediction")
)

# Προαιρετικά, μπορείτε τώρα να αφαιρέσετε την προσωρινή στήλη 'prediction'
df_results = df_results.drop("clustering_text_cleaned", "prediction", "clustering_text_raw", "words", "filtered_words",
                             "raw_features", "features")

print("✅ Η ομαδοποίηση ολοκληρώθηκε.")
df_results.show(truncate=50)

save_df(df_results, "courses")
