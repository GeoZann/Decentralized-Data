import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Home.css'; 

// --- HELPER: Normalize Language ---
const normalizeLanguage = (lang) => {
  if (!lang) return "English";
  const langStr = String(lang);
  const lower = langStr.toLowerCase().trim();
  if (lower === 'en' || lower === 'en-us' || lower === 'english') { return "English"; }
  return langStr; 
};

// --- HELPER: Normalize Level ---
const normalizeLevel = (level) => {
  if (!level) return "Unspecified";
  const levelStr = String(level);
  let clean = levelStr.replace(/level/gi, "").trim();
  if (clean.toLowerCase() === 'introductory') { return "Beginner"; }
  return clean;
};

// --- COMPONENT: Smart Title ---
const CourseTitle = ({ text, highlight }) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    const checkTruncation = () => {
      if (titleRef.current) {
        const isOverflowing = titleRef.current.scrollHeight > titleRef.current.clientHeight + 1;
        setIsTruncated(isOverflowing);
      }
    };
    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [text]);

  const getHighlightedText = (text, highlight) => {
    if (!highlight) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() ? (
        <span key={i} style={{ color: '#880e4f', fontWeight: 'bold', backgroundColor: '#fce4ec' }}>
          {part}
        </span>
      ) : ( part )
    );
  };

  return (
    <h3 
      ref={titleRef} 
      title={isTruncated ? text : null}
      style={{
        margin: '0 0 10px 0', 
        color: '#222', fontSize: '1.1rem', lineHeight: '1.5', height: '3.3rem',        
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        textOverflow: 'ellipsis', cursor: isTruncated ? 'help' : 'default'
      }}
    >
      {getHighlightedText(text, highlight)}
    </h3>
  );
};

function Home() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterLanguage, setFilterLanguage] = useState('All');

  // UI States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState(1); 
  const [isSticky, setIsSticky] = useState(false); 
  const itemsPerPage = 18; 

  useEffect(() => {
    // REMOVED ?limit=1000 here
    axios.get('http://localhost:3000/courses')
      .then(response => {
        setCourses(response.data.data); 
        setLoading(false);
      })
      .catch(err => {
        console.error(err); // Keep error logging
        setError("Could not load courses.");
        setLoading(false);
      });
  }, []);

  // Sticky Scroll Handler
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setPageInput(1);
  }, [searchTerm, filterLevel, filterSource, filterCategory, filterLanguage]);

  useEffect(() => {
    setPageInput(currentPage);
  }, [currentPage]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterLevel('All');
    setFilterSource('All');
    setFilterCategory('All');
    setFilterLanguage('All');
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Lists & Filtering
  const uniqueCategories = ['All', ...new Set(courses.map(c => c.category || 'Other'))].sort();
  const uniqueLanguages = ['All', ...new Set(courses.map(c => normalizeLanguage(c.language)))].sort();

  const filteredCourses = courses.filter(course => {
    const titleMatch = course.title && course.title.toLowerCase().includes(searchTerm.toLowerCase());
    const courseLevelRaw = String(course.level || "").toLowerCase();
    let levelMatch = true;
    if (filterLevel === 'Beginner') levelMatch = courseLevelRaw.includes('beginner') || courseLevelRaw.includes('introductory');
    else if (filterLevel !== 'All') levelMatch = courseLevelRaw.includes(filterLevel.toLowerCase());

    const courseSource = course.source_repository || "Unknown";
    const sourceMatch = filterSource === 'All' || courseSource === filterSource;
    const categoryMatch = filterCategory === 'All' || (course.category || "Other") === filterCategory;
    const languageMatch = filterLanguage === 'All' || normalizeLanguage(course.language) === filterLanguage;
    
    return titleMatch && levelMatch && sourceMatch && categoryMatch && languageMatch;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const currentItems = filteredCourses.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);

  // Input Handlers
  const handleInputChange = (e) => setPageInput(e.target.value);
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      let val = parseInt(pageInput);
      if (!val) val = 1;
      if (val < 1) val = 1;
      if (val > totalPages) val = totalPages;
      handlePageChange(val);
      e.target.blur(); 
    }
  };
  const handleInputFocus = (e) => e.target.select();

  return (
    <div className="home-container">
      
      {/* Header */}
      <div className="home-header">
        <h1>Course Finder</h1>
        <p>Find the best learning courses from edX and Coursera</p>
      </div>
      
      {/* Filter Bar */}
      <div className={`filter-bar ${isSticky ? 'sticky' : ''}`}>
        <input 
          type="text" 
          placeholder="Search by title..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          className="filter-input"
        />

        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="filter-select">
           {uniqueCategories.map(cat => (
             <option key={cat} value={cat}>{cat === 'All' ? 'All Topics' : cat}</option>
           ))}
        </select>

        <select value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)} className="filter-select">
           {uniqueLanguages.map(lang => (
             <option key={lang} value={lang}>{lang === 'All' ? 'All Languages' : lang}</option>
           ))}
        </select>

        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="filter-select">
          <option value="All">All Levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>

        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="filter-select">
          <option value="All">All Sources</option>
          <option value="edX">edX</option>
          <option value="Coursera">Coursera</option>
        </select>

        <button onClick={clearFilters} className="action-button" style={{ minWidth: '110px' }}>
          Clear Filters
        </button>
      </div>

      {loading && <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Loading...</div>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Results Info */}
      {!loading && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', color: '#888' }}>
            <span>Found {filteredCourses.length} courses</span>
            <span>Page {currentPage} of {totalPages || 1}</span>
        </div>
      )}

      {/* NO RESULTS FOUND */}
      {!loading && filteredCourses.length === 0 && (
        <div className="no-results">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '10px', color: '#fff' }}>No courses found</h2>
          <p style={{ marginBottom: '20px' }}>Try adjusting your filters or search terms.</p>
          <button onClick={clearFilters} className="action-button" style={{ minWidth: '110px' }}>
            Reset Filters
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="course-grid">
        {currentItems.map(course => (
          <div key={course._id} className="course-card">
            
            <CourseTitle text={course.title} highlight={searchTerm} />
            
            <div className="card-badges">
              <span className="card-badge">📂 {course.category || 'General'}</span>
              <span className="card-badge">🌐 {normalizeLanguage(course.language)}</span>
              <span className="card-badge">📊 {normalizeLevel(course.level)}</span>
              <span className={`card-badge ${course.source_repository === 'edX' ? 'badge-edx' : 'badge-coursera'}`}>
                {course.source_repository || 'Unknown'}
              </span>
            </div>

            <Link to={`/course/${course._id}`} style={{ textDecoration: 'none' }}>
              <button className="action-button view-details-btn">
                View Details
              </button>
            </Link>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="pagination-container">
            <button className="pagination-btn" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>&laquo;</button>
            <button className="pagination-btn" onClick={() => handlePageChange(Math.max(currentPage - 1, 1))} disabled={currentPage === 1}>&lsaquo;</button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: '#888' }}>Page</span>
                <input 
                    type="number" min="1" max={totalPages}
                    value={pageInput} 
                    onChange={handleInputChange}   
                    onKeyDown={handleInputKeyDown} 
                    onFocus={handleInputFocus}     
                    className="page-input"
                />
                <span style={{ color: '#888' }}>of {totalPages}</span>
            </div>

            <button className="pagination-btn" onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))} disabled={currentPage === totalPages}>&rsaquo;</button>
            <button className="pagination-btn" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}>&raquo;</button>
        </div>
      )}
    </div>
  );
}

export default Home;
