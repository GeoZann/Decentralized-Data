const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

//DATABASE
const mongoURI = "mongodb+srv://Giorgos:root@cluster0.c940dbb.mongodb.net/CourseDB";
mongoose.connect(mongoURI)
  .then(() => console.log(" Connected to MongoDB..."))
  .catch(err => console.error(" Connection Error:", err));

// SCHEMAS
const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  level: String,
  language: String,
  original_url: String,
  source_repository: String
});
const Course = mongoose.model('Course', courseSchema, 'courses');

const similaritySchema = new mongoose.Schema({}, { strict: false });
const CourseSimilarity = mongoose.model('CourseSimilarity', similaritySchema, 'course_similarity');

//LANGUAGE GROUPS
//Merging edX codes and Coursera names
const languageGroups = {
    'English': ['en', 'en-us', 'english', 'eng'],
    'Spanish': ['es', 'es-es', 'spanish', 'español'],
    'French': ['fr', 'fr-fr', 'french', 'français'],
    'Chinese': ['zh', 'zh-cn', 'chinese', 'mandarin'],
    'Italian': ['it', 'italian', 'italiano'],
    'German': ['de', 'german', 'deutsch'],
    'Russian': ['ru', 'russian'],
    'Portuguese': ['pt', 'portuguese', 'português']
};

// Helper to normalize raw DB values ( "en" -> "English")
const getUnifiedLanguageName = (rawCode) => {
    if (!rawCode) return "Other";
    const lower = rawCode.toLowerCase().trim();
    
    // Check against groups
    for (const [groupName, variations] of Object.entries(languageGroups)) {
        if (variations.includes(lower)) return groupName;
    }
    
    // Fallback: Capitalize first letter ('jap' -> 'Jap')
    return rawCode.charAt(0).toUpperCase() + rawCode.slice(1);
};

//API ENDPOINTS

//GET FILTERS
app.get('/filters', async (req, res) => {
    try {
        //CATEGORIES
        const categoryStats = await Course.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 30 }
        ]);
        const categories = categoryStats
            .filter(item => item._id && item._id.trim() !== '')
            .map(item => item._id)
            .sort();

        //LANGUAGES
        //Get ALL raw languages from DB
        const rawLanguages = await Course.distinct('language');
        
        //Normalize them into a Set to remove duplicates
        const uniqueNames = new Set();
        rawLanguages.forEach(lang => {
            if (lang) uniqueNames.add(getUnifiedLanguageName(lang));
        });

        res.json({
            categories: categories,
            languages: Array.from(uniqueNames).sort()
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load filters" });
    }
});

//GET COURSES
app.get('/courses', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 18;
    const skip = (page - 1) * limit;

    let filter = {};

    //CATEGORY
    if (req.query.category && req.query.category !== 'All') {
        const escapedCat = req.query.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.category = { $regex: new RegExp(`^${escapedCat}$`, 'i') }; 
    }

    //LANGUAGE
    if (req.query.language && req.query.language !== 'All') {
        const selected = req.query.language;
        
        // Check if we have a group
        const groupMatches = languageGroups[selected];

        if (groupMatches) {
            // Search for any of the variations
            const regexList = groupMatches.map(val => new RegExp(`^${val}$`, 'i'));
            filter.language = { $in: regexList };
        } else {
            filter.language = { $regex: new RegExp(`^${selected}$`, 'i') };
        }
    }

    //LEVEL
    if (req.query.level && req.query.level !== 'All') {
         if (req.query.level === 'Beginner') filter.level = { $regex: /Beginner|Introductory/i };
         else filter.level = { $regex: req.query.level, $options: 'i' };
    }

    //SOURCE & SEARCH
    if (req.query.source_repository && req.query.source_repository !== 'All') {
        filter.source_repository = { $regex: req.query.source_repository, $options: 'i' };
    }
    if (req.query.search) {
        filter.title = { $regex: req.query.search, $options: 'i' };
    }

    const [courses, totalCount] = await Promise.all([
      Course.find(filter).skip(skip).limit(limit),
      Course.countDocuments(filter)
    ]);
    
    res.status(200).json({ success: true, count: courses.length, total: totalCount, data: courses });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

//SINGLE COURSE
app.get('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Not found" });
    res.json(course);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

//RECOMMENDATIONS
app.get('/courses/:id/similar', async (req, res) => {
  try {
    const simDoc = await CourseSimilarity.findById(req.params.id);
    if (!simDoc || !simDoc.top_5_similar_docs) return res.json({ similar_courses: [] });

    const rawList = simDoc.toObject().top_5_similar_docs;
    const targetIds = rawList.map(item => item.similar_doc_id.oid || item.similar_doc_id);

    const details = await Course.find({ '_id': { $in: targetIds } }).select('title source_repository level');

    const results = details.map(c => {
        const match = rawList.find(r => String(r.similar_doc_id.oid || r.similar_doc_id) === String(c._id));
        return { id: c._id, title: c.title, level: c.level, score: match ? match.distance : 0 };
    });
    res.json({ similar_courses: results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

//SYNC
app.get('/sync/:source', (req, res) => {
  const source = req.params.source.toLowerCase();
  const pythonProcess = spawn('python3', ['harvester.py', source]);
  
  pythonProcess.stdout.on('data', (d) => console.log(`[Py]: ${d}`));
  pythonProcess.stderr.on('data', (d) => console.error(`[Py Err]: ${d}`));
  
  res.status(202).json({ message: "Sync started", status: "processing" });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
