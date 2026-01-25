import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './course_details.css';

// ... (Keep normalizeLanguage and normalizeLevel helpers exactly as they were) ...
const normalizeLanguage = (lang) => { /* ... */ return lang || "English"; };
const normalizeLevel = (level) => { /* ... */ return level || "Unspecified"; };

function CourseDetails() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [similarCourses, setSimilarCourses] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setCourse(null);
    setSimilarCourses([]);
    setError(null);

    const fetchCourse = axios.get(`http://localhost:3000/courses/${id}`);
    const fetchSimilar = axios.get(`http://localhost:3000/courses/${id}/similar`);

    Promise.allSettled([fetchCourse, fetchSimilar])
      .then((results) => {
        const courseResult = results[0];
        const similarResult = results[1];

        if (courseResult.status === 'fulfilled') {
          const rawData = courseResult.value.data;
          setCourse(rawData.data || rawData);
        } else {
          setError("Course not found.");
        }

        if (similarResult.status === 'fulfilled' && similarResult.value.data) {
          const data = similarResult.value.data;
          const list = (data.similar_courses && Array.isArray(data.similar_courses)) 
            ? data.similar_courses 
            : (Array.isArray(data) ? data : []);
          setSimilarCourses(list);
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Loading...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '50px' }}>{error}</div>;
  if (!course) return null;

  const courseUrl = course.original_url || course.url || course.link;

  return (
    <div className="course-container">
      
      {/* Back Button */}
      <Link to="/" className="back-link">
        <span style={{ marginRight: '5px' }}>&larr;</span> Back to Search
      </Link>

      {/* Main Course Card */}
      <div className="main-card">
        
        {/* Header */}
        <div className="card-header">
            <h1 className="course-title">{course.title}</h1>
            
            <div className="badges-container">
                <span className="badge">📂 {course.category || "General"}</span>
                <span className="badge">🌐 {normalizeLanguage(course.language)}</span>
                <span className="badge">📊 {normalizeLevel(course.level)}</span>
                <span className="badge" style={{ 
                    backgroundColor: course.source_repository === 'edX' ? '#c62828' : '#1565c0' 
                }}>
                    {course.source_repository || "External"}
                </span>
            </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#444', marginBottom: '10px' }}>About this Course</h3>
            <p style={{ lineHeight: '1.6', color: '#333', fontSize: '1.1rem' }}>
               {course.description ? course.description : "No description available."}
            </p>
        </div>

        {/* Action Button */}
        {courseUrl && (
          <div className="cta-container">
              <a href={courseUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <button className="cta-button">
                    Go to Course Website &rarr;
                </button>
              </a>
          </div>
        )}
      </div>

      {/* Recommendations Section */}
      <div className="recommendations-section">
          <h3 className="recommendations-title">You might also like</h3>
          
          {similarCourses.length > 0 ? (
            <div className="recommendations-list">
                {similarCourses.map((sim, index) => (
                    <div key={sim.id || index} className="similar-row">
                        <div style={{ flex: 1, paddingRight: '15px' }}>
                           <h4 className="similar-title">
                               {sim.title || "Similar Course"}
                           </h4>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                            <Link to={`/course/${sim.id}`} onClick={() => window.scrollTo(0,0)} style={{ textDecoration: 'none' }}>
                                {/* Standard button class handles hover now! */}
                                <button className="view-button">View</button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
          ) : (
            <div className="empty-state">
              No AI recommendations available for this course yet.
            </div>
          )}
      </div>
    </div>
  );
}

export default CourseDetails;
