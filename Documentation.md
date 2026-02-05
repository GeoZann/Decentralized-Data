# Horizontal Repository/Aggregator for Open Courses

**Academic Year:** 2025-2026

**Team Members:**
| Name | Student ID (AM) | Year |
| :--- | :--- | :--- |
| Zannis Georgios | 1093356 | 5th |
| Zafeiris Vasileios | 1093359 | 5th |
| Psaltiras Panagiotis | 1093516 | 5th |
| Vasilopoulos Panagiotis | 1097454 | 5th |

---

## Table of Contents
1. Introduction & Problem Definition
2. Development Methodology & Project Management
3. System Architecture
4. Technological Background & Design Choices
5. Data Collection, Normalization, and Storage
6. Backend API & Business Logic
7. Spark ML Pipeline & Algorithms
8. Frontend & Application Functionality
9. Limitations & Future Work
10. Conclusions

---

## Executive Summary
This document presents the design, implementation, and evaluation of a decentralized system for collecting, consolidating, and recommending online educational courses. The system functions as a horizontal aggregator, gathering data from multiple heterogeneous educational platforms and offering them to users through a unified interface, enriched with search mechanisms and intelligent recommendations.

The architecture is based on three layers: (a) Python scripts for data harvesting, (b) Node.js/Express RESTful API for business logic, and (c) React Frontend.

---

## 1. Introduction & Problem Definition

### 1.1 Purpose
The purpose of this project is the design and implementation of a comprehensive search and recommendation system for online courses. The system aggregates data from multiple sources (edX and Coursera), homogenizes it, and offers users the ability to discover courses based on content and relevance.

### 1.2 The Problem
The rapid growth of Massive Open Online Courses (MOOCs) has led to information fragmentation. Users are forced to navigate multiple platforms without the ability to centrally compare options. Technically, the problem is exacerbated by data heterogeneity (different metadata schemas, update frequencies, and categorization).

### 1.3 The Solution
The project aims to develop a system that achieves the following:
1.  **Data Harvesting & Storage:** Automated collection from APIs and storage in MongoDB.
2.  **Machine Learning:** NLP and Clustering (Apache Spark) for extracting recommendations.
3.  **Web Application:** A interactive web application (React + Node.js) for search, filtering, and result visualization.

---

## 2. Development Methodology & Project Management

### 2.1 Collaboration & Version Control (GitHub Workflow)
The team adopted a **Centralized Workflow** model on GitHub, allowing for immediate sharing of updates and Continuous Integration. Through regular commits and pulls, conflicts were minimized, ensuring that all members had access to the latest code version at all times.

### 2.2 Task Allocation
To maximize efficiency, the project was divided into functional modules based on the specialized skills of each member:

* **Zannis Georgios (Data & Database Engineering):** Responsible for designing the MongoDB database and implementing the **Data Harvesting** mechanisms, including scripts for collecting and homogenizing data from external sources.
* **Psaltiras Panagiotis (Machine Learning Engineering):** Undertook the development of algorithms in **Apache Spark**. Implemented Clustering and Similarity Search (LSH) processes, forming the system's intelligence.
* **Vasilopoulos Panagiotis (Backend Development):** Focused on the development of the **Node.js/Express API**. Implemented the middleware connection between the database and the Frontend, managing data flow and API endpoints.
* **Zafeiris Vasileios (Frontend Development):** Implemented the user interface (UI Dashboard) using the **React** library. Designed the interactive navigation experience and result presentation.

### 2.3 Architectural Optimization (Refactoring)
During development, it was identified that executing complex filtering logic on the client-side (React) burdened browser performance. Consequently, a strategic decision was made to perform **Server-Side Migration**. Business logic was moved from the Frontend to the Backend (Node.js), drastically reducing client load and improving response times.

---

## 3. System Architecture
The system follows a multi-tier architecture to separate presentation, business logic, and data processing.

**The 4 Subsystems:**
1.  **Data Harvesting Layer:** Python scripts / Connectors.
2.  **Data Storage Layer:** MongoDB.
3.  **Application/Backend Layer:** Node.js & Express API.
4.  **Frontend Layer:** React UI.

*(Refer to the Architecture Diagram in the original document, Page 6)*

---

## 4. Technological Background & Design Choices

### 4.1 Technology Selection
* **MongoDB:** Storage of semi-structured data (JSON documents).
* **Python - Apache Spark:** Selected for data collection and ML pipelines due to their rich ecosystem of data processing libraries.
* **Node.js & Express:** Asynchronous backend for efficient request handling.
* **React:** Component-based UI for dynamic Single Page Applications (SPAs).

### 4.2 Architectural Decisions
A key design decision was the centralization of business logic in the Backend. This enhances security, allows for centralized rule management, and ensures consistent performance regardless of the client device's power.

---

## 5. Data Collection, Normalization, and Storage

### 5.1 Data Harvesting (ETL Pipeline)
The `harvester.py` script functions as an ETL (Extract, Transform, Load) process:
1.  **Extract:** Connects to external APIs.
2.  **Transform:** Cleans data and converts it into a Unified Schema.
3.  **Load:** Inserts into MongoDB using **Upsert** logic to avoid duplicates.

### 5.2 Database Schema Design

**Collection `courses`**
| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key |
| `title` | String | Course Title |
| `description` | String | Detailed description |
| `category` | String | Thematic category |
| `level` | String | Difficulty level |
| `original_url` | String | Link to provider |
| `cluster` | Int | ML Clustering result |
| `clustering_text_cleaned`| String | Text after NLP cleaning |

**Collection `course_similarity`**
Stores Spark results to decouple heavy computational load from live search. Contains the `_id` and a list of `top_5_similar_docs` with their `distance` (Euclidean/Cosine).

---

## 6. Backend API & Business Logic
The Backend (Node.js/Express) exposes RESTful endpoints.

### 6.1 Endpoints
* **`GET /courses`**: Returns a paginated list using **Server-Side Pagination** and **Dynamic Filtering**. Uses `Promise.all` for parallel execution of the data query and the total count aggregation.
* **`GET /courses/:id`**: Retrieves detailed course metadata.
* **`GET /courses/:id/similar`**: Implements the recommendation mechanism via an **Application-Level Join** with the `course_similarity` collection.
* **`GET /sync/:source`**: Asynchronously triggers the Python harvester using child processes.

---

## 7. Spark ML Pipeline & Algorithms

### 7.1 Similarity Search
Implemented using PySpark (`sparkTFIDF.py`). Uses descriptive text for semantic analysis.

#### 7.1.1 Pre-processing and Vectorization
1.  **Tokenizer:** Splits text into tokens.
2.  **StopWords Remover:** Removes common words without semantic value.
3.  **HashingTF:** Creates frequency vectors ($2^{16}$ features) to minimize hash collisions.
4.  **IDF:** Weights terms based on rarity.
5.  **Normalizer (L2):** Normalizes vectors to unit length.

#### 7.1.2 Similarity Calculation with LSH
**Locality Sensitive Hashing (LSH)** is used to reduce complexity from $O(n^2)$ to near-linear time. Bucketed Random Projection was employed.
Formula for converting distance to similarity:
$$Similarity = 1 - \frac{EuclideanDistance^2}{2}$$

### 7.2 Clustering
The **Bisecting K-Means** algorithm (hierarchical approach) was selected with $K=20$ and TF-IDF features ($2000$), as it performs better on high-dimensional text data compared to standard K-Means.

### 7.3 User Suggestions
The `sparkSuggestions.py` script implements **Item-Based Collaborative Filtering**. It recommends courses based on user "Likes," filtering out already liked items and ranking candidates by minimum distance.

---

## 8. Frontend & Application Functionality
Implemented as an SPA using **React.js**, **React Router**, and **Axios**.

### 8.1 Performance Optimization
1.  **Server-Side Pagination:** Retrieving only necessary records (e.g., 18 per page).
2.  **Server-Side Filtering:** Filters are executed directly on the database.
3.  **Client-Side Caching:** Preservation of filter state and scroll position when navigating back to the list.

### 8.2 Pages
* **Dashboard:** Search, Filters (Topic, Language, Level, Source), and Grid View of cards.
* **Course Details:** Display of metadata and a **"You might also like"** section featuring the 5 semantically closest courses.

---

## 9. Conclusions
The project successfully achieved the creation of a comprehensive system for decentralized collection and presentation of educational data. Through the use of Spark and MongoDB, scalability was ensured, while the modern stack (MERN) provided a robust and professional solution.
