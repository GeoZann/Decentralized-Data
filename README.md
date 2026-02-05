# Decentralized Data Aggregation & Recommendation System

> A horizontal aggregator for Open Courseware, featuring Large-Scale Machine Learning recommendations, built with Apache Spark and React.js/Node.js & Express.


![Status](https://img.shields.io/badge/Status-Completed-success)
![University](https://img.shields.io/badge/Context-University%20Project-blue)
![Tech](https://img.shields.io/badge/Tech-Python%20%7C%20Spark%20%7C%20NoSQL%20%7C%20React.js%20%7C%20Node.js%20&%20Express-orange)

## Overview
This project addresses the fragmentation of online education by centralizing data from heterogeneous sources (Coursera, edX) into a unified repository.
Beyond simple aggregation, it utilizes **Apache Spark** to generate intelligent content-based recommendations using **Locality Sensitive Hashing (LSH)** and **Clustering**.


## Key Features
* **Automated Harvesting (ETL):** Python connectors that extract, transform, and load data into MongoDB with upsert logic.
* **Smart Recommendations:** Content-based filtering using TF-IDF vectorization and LSH (Approximated Nearest Neighbors).
* **Intelligent Clustering:** Automatic course categorization using Bisecting K-Means.
* **Optimized Performance:** * **Server-Side Pagination & Filtering:** Handles 7,500+ courses efficiently by offloading logic to the backend.
* **Client-Side Caching:** Persists state and scroll position for a seamless UX.
* **Item-Based Collaborative Filtering:** User suggestion mechanism based on liked courses.

## Tech Stack

### Data & Machine Learning
* **Python:** ETL scripting.
* **Apache Spark (PySpark):** Distributed processing for NLP, LSH, and K-Means.
* **MongoDB:** NoSQL database for flexible schema storage.

### Application
* **Node.js & Express:** RESTful API handling business logic and child processes for the harvester.
* **React.js:** Single Page Application (SPA) with responsive grid layout.

## Architecture
The system follows a multi-tier architecture:
1.  **Harvesting Layer:** Python scripts fetch and normalize data.
2.  **Storage Layer:** MongoDB stores courses and pre-calculated similarity matrices.
3.  **Processing Layer:** Spark jobs run asynchronously to update clusters and recommendations.
4.  **Web Layer:** Node.js serves data to the React frontend.


## Installation & Setup

## Prerequisites
* **Node.js** (v16+) & **npm**
* **Python** (v3.8+)
* **Internet Connection** (Required to connect to the Cloud Database)

##  Quick Start (Evaluation Mode)
The project is pre-configured to connect to a **MongoDB Atlas Cloud Cluster**. You do **not** need to install MongoDB locally or populate the database manually.

```bash
# 1. Clone the repository
git clone [https://github.com/GeoZann/Decentralized-Data](https://github.com/GeoZann/Decentralized-Data)

# 2. Install Backend Dependencies
cd backend
npm install

# 3. Install Frontend Dependencies
cd ../frontend
npm install

# 4. Start the Application
# Open two separate terminal windows:

# Terminal 1 (Backend API):
cd backend
npm start


# Terminal 2 (Frontend UI):
cd frontend
npm start
```

## Contributors

This project was designed and built as a group assignment for the **Computer Engineering and Informatics Department** of the **University of Patras** .

* **Georgios Zannis** [GitHub Profile](https://github.com/GeoZann)
* **Vasileios Zafeiris** [GitHub Profile](https://github.com/vasizaf)
* **Panagiotis Psaltiras** [GitHub Profile](https://github.com/Pan4g10tis)
* **Panagiotis Vasilopoulos** [GitHub Profile](https://github.com/PanagiotisVas)
