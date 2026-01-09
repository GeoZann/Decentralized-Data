const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
// Database Connection
const mongoURI = "mongodb+srv://Giorgos:root@cluster0.c940dbb.mongodb.net/CourseDB";

mongoose.connect(mongoURI)
  .then(() => console.log("Connected to MongoDB..."))
  .catch(err => console.error("Connection Error:", err));

// Schema Definition
const courseSchema = new mongoose.Schema({
  title: String,
  cluster: mongoose.Schema.Types.Mixed // Mixed allows both Numbers and Strings
});

const Course = mongoose.model('Course', courseSchema, 'courses');

const similaritySchema = new mongoose.Schema({}, { strict: false });
const CourseSimilarity = mongoose.model('CourseSimilarity', similaritySchema, 'course_similarity');

// The /courses Endpoint
app.get('/courses', async (req, res) => {
  try {
    // 1. Get page and limit from the URL query, or set defaults
    // Example: /courses?page=2&limit=5
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // 2. Calculate how many documents to skip
    const skip = (page - 1) * limit;

    // 3. Query the database
    const courses = await Course.find({})
      .select('title cluster') // Only return these specific fields (+ _id)
      .skip(skip)
      .limit(limit);

    // 4. (Optional) Get total count for the frontend to know how many pages exist
    const totalCourses = await Course.countDocuments();

    res.json({
      total: totalCourses,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalCourses / limit),
      data: courses
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// Get a single course by ID
app.get('/courses/:id', async (req, res) => {
  try {
    // 1. Grab the ID from the URL parameters
    const courseId = req.params.id;

    // 2. Search the database
    // findById automatically looks for the _id field
    const course = await Course.findById(courseId);

    // 3. Handle if the course doesn't exist
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // 4. Return all values for that document
    res.json(course);
  } catch (err) {
    // Handle invalid ID formats (e.g., if the ID string isn't a valid MongoDB ObjectId)
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

app.get('/courses/:id/similar', async (req, res) => {
  try {
    const courseId = req.params.id;

    // Search the similarity collection
    // We search where the document's _id matches the one provided
    const similarities = await CourseSimilarity.findById(courseId);

    if (!similarities) {
      return res.status(404).json({ message: "No similarity data found for this ID" });
    }

    res.json(similarities);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);

});
