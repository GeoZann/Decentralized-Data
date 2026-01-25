const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// NEW: Import spawn to run Python scripts (from your friend's code)
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
const mongoURI = "mongodb+srv://Giorgos:root@cluster0.c940dbb.mongodb.net/CourseDB";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ Connected to MongoDB..."))
  .catch(err => console.error("❌ Connection Error:", err));

// --- SCHEMAS (KEPT YOUR FULL VERSION) ---
const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  level: String,
  language: String,
  original_url: String,
  source_repository: String,
  cluster: mongoose.Schema.Types.Mixed
});
const Course = mongoose.model('Course', courseSchema, 'courses');

const similaritySchema = new mongoose.Schema({}, { strict: false });
const CourseSimilarity = mongoose.model('CourseSimilarity', similaritySchema, 'course_similarity');

// --- API ENDPOINTS ---

// 1. GET ALL COURSES (Kept your logic)

app.get('/courses', async (req, res) => {
  try {
    let query = Course.find({}); 

    if (req.query.limit) {
      const limitVal = parseInt(req.query.limit);
      query = query.limit(limitVal);
    }

    const [courses, totalCount] = await Promise.all([
      query,
      Course.countDocuments({}) // Get the total number of docs in DB
    ]);
    
    res.status(200).json({
      success: true,
      count: courses.length,
      total: totalCount, 
      data: courses
    });

  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. GET SINGLE COURSE
app.get('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Not found" });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET SMART RECOMMENDATIONS (Kept your logic)
app.get('/courses/:id/similar', async (req, res) => {
  try {
    const courseId = req.params.id;
    const similarityDoc = await CourseSimilarity.findById(courseId);

    if (!similarityDoc) {
      return res.status(404).json({ message: "No similarity data found" });
    }

    const rawList = similarityDoc.toObject().top_5_similar_docs || [];
    
    if (rawList.length === 0) {
      return res.json({ similar_courses: [] });
    }

    const targetIds = rawList.map(item => {
      if (item.similar_doc_id && item.similar_doc_id.oid) {
        return item.similar_doc_id.oid;
      }
      return item.similar_doc_id;
    });

    const similarCoursesDetails = await Course.find({
      '_id': { $in: targetIds }
    }).select('title source_repository level');

    const finalResults = similarCoursesDetails.map(course => {
      const originalMatch = rawList.find(r => {
        const rId = r.similar_doc_id.oid || r.similar_doc_id;
        return String(rId) === String(course._id);
      });
      
      return {
        id: course._id,
        title: course.title,
        level: course.level,
        score: originalMatch ? originalMatch.distance : 0 
      };
    });

    res.json({ similar_courses: finalResults });

  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// 4. SYNC / HARVESTER (ADDED FROM FRIEND'S CODE)
app.get('/sync/:source', (req, res) => {
  const source = req.params.source.toLowerCase();

  // Validation
  if (source !== 'edx' && source !== 'coursera') {
    return res.status(400).json({ 
      message: "Invalid source. Allowed values: 'edx', 'coursera'" 
    });
  }

  console.log(`🚀 Starting sync for: ${source}`);

  // Spawn the Python process
  // Ensure 'harvester.py' is in the same folder as this server file!
  const pythonProcess = spawn('python3', ['harvester.py', source]);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python]: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Error]: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`[Python] Child process exited with code ${code}`);
  });

  res.status(202).json({ 
    message: `Sync started for ${source}. Check server logs for progress.`,
    status: "processing"
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
