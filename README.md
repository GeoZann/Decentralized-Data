# Decentralized Data Aggregation & Recommendation System

> A horizontal aggregator for Open Courseware, featuring Large-Scale Machine Learning recommendations, built with Apache Spark and React.js/Node.js & Express.

![Status](https://img.shields.io/badge/Status-Completed-success)
![University](https://img.shields.io/badge/Context-University%20Project-blue)
![Tech](https://img.shields.io/badge/Tech-Python%20%7C%20Spark%20%7C%20NoSQL%20%7C%20React.js%20%7C%20Node.js%20&%20Express-orange)

## Overview
[cite_start]This project addresses the fragmentation of online education by centralizing data from heterogeneous sources (Coursera, edX) into a unified repository[cite: 27, 28]. [cite_start]Beyond simple aggregation, it utilizes **Apache Spark** to generate intelligent content-based recommendations using **Locality Sensitive Hashing (LSH)** and **Clustering**[cite: 34].


## Key Features
* [cite_start]**Automated Harvesting (ETL):** Python connectors that extract, transform, and load data into MongoDB with upsert logic [cite: 136-139].
* [cite_start]**Smart Recommendations:** Content-based filtering using TF-IDF vectorization and LSH (Approximated Nearest Neighbors)[cite: 258, 268].
* [cite_start]**Intelligent Clustering:** Automatic course categorization using Bisecting K-Means[cite: 286].
* [cite_start]**Optimized Performance:** * **Server-Side Pagination & Filtering:** Handles 7,500+ courses efficiently by offloading logic to the backend[cite: 311].
* [cite_start]**Client-Side Caching:** Persists state and scroll position for a seamless UX[cite: 315].
* [cite_start]**Item-Based Collaborative Filtering:** User suggestion mechanism based on liked courses[cite: 292].

## Tech Stack

### Data & Machine Learning
* [cite_start]**Python:** ETL scripting[cite: 122].
* [cite_start]**Apache Spark (PySpark):** Distributed processing for NLP, LSH, and K-Means[cite: 248].
* [cite_start]**MongoDB:** NoSQL database for flexible schema storage[cite: 121].

### Application
* [cite_start]**Node.js & Express:** RESTful API handling business logic and child processes for the harvester[cite: 124].
* [cite_start]**React.js:** Single Page Application (SPA) with responsive grid layout[cite: 125].

## Architecture
[cite_start]The system follows a multi-tier architecture[cite: 57]:
1.  **Harvesting Layer:** Python scripts fetch and normalize data.
2.  **Storage Layer:** MongoDB stores courses and pre-calculated similarity matrices.
3.  **Processing Layer:** Spark jobs run asynchronously to update clusters and recommendations.
4.  **Web Layer:** Node.js serves data to the React frontend.

## Team & Roles
| Member | Role | Responsibilities |
| :--- | :--- | :--- |
| **Zannis Georgios** | Data/DB Engineer | [cite_start]MongoDB Schema, Data Harvesting (ETL) [cite: 47, 48] |
| **Psaltiras Panagiotis** | ML Engineer | [cite_start]Spark Pipelines, LSH, Clustering Algorithms [cite: 49, 50] |
| **Vasilopoulos Panagiotis** | Backend Lead | [cite_start]Node.js API, System Integration, Server-side Logic [cite: 51, 52] |
| **Zafeiris Vasileios** | Frontend Lead | [cite_start]React UI/UX, Dashboard, State Management [cite: 53, 54] |

## Installation & Setup

```bash
# 1. Clone the repository
git clone [https://github.com/GeoZann/Decentralized-Data](https://github.com/GeoZann/Decentralized-Data)

# 2. Install Backend Dependencies
cd backend
npm install

# 3. Install Frontend Dependencies
cd ../frontend
npm install

# 4. Run the Harvester (Python)
python harvester.py

# 5. Start the Server (Node.js)
cd backend
npm start

# 6. Start the Client (React)
cd frontend
npm start
```

## Contributors

This project was designed and built as a group assignment for the **Computer Engineering and Informatics Department** of the **University of Patras** .

* **[Georgios Zannis]** [GitHub Profile](https://github.com/GeoZann)
* **[Vasileios Zafeiris]** [GitHub Profile](https://github.com/vasizaf)
* **[Panagiotis Psaltiras]** [GitHub Profile](https://github.com/Pan4g10tis)
* **[Panagiotis Vasilopoulos]** [GitHub Profile](https://github.com/PanagiotisVas)
