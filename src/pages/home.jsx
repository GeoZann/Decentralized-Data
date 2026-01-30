// src/pages/Home.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Home.css'; 

// --- 1. THE MEMORY CACHE ---
const homeCache = {
  data: null,
  total: 0,
  scrollY: 0,
  search: '',
  level: 'All',
  source: 'All',
  category: 'All',
  language: 'All',
  page: 1,
  cachedCategories: [],
  cachedLanguages: []
};

// --- HELPERS ---
const normalizeLanguage = (lang) => {
  if (!lang) return "English";
  const langStr = String(lang);
  const lower = langStr.toLowerCase().trim();
  if (lower === 'en' || lower === 'en-us' || lower === 'english') { return "English"; }
  // Capitalize 2-letter codes for better look (e.g. 'fr' -> 'FR')
  if (langStr.length === 2) return langStr.toUpperCase();
  return langStr; 
};

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
  const [courses, setCourses] = useState(homeCache.data || []);
  const [serverTotal, setServerTotal] = useState(homeCache.total || 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [categoryOptions, setCategoryOptions] = useState(homeCache.cachedCategories || []);
  const [languageOptions, setLanguageOptions] = useState(homeCache.cachedLanguages || []);

  const [searchTerm, setSearchTerm] = useState(homeCache.search);
  const [filterLevel, setFilterLevel] = useState(homeCache.level);
  const [filterSource, setFilterSource] = useState(homeCache.source);
  const [filterCategory, setFilterCategory] = useState(homeCache.category);
  const [filterLanguage, setFilterLanguage] = useState(homeCache.language);

  const [currentPage, setCurrentPage] = useState(homeCache.page);
  const [pageInput, setPageInput] = useState(homeCache.page); 
  const [isSticky, setIsSticky] = useState(false); 
  
  const itemsPerPage = 18; 

  // --- 1. FETCH DYNAMIC FILTERS ---
  useEffect(() => {
    if (categoryOptions.length === 0) {
      axios.get('http://localhost:3000/filters')
        .then(res => {
          setCategoryOptions(res.data.categories);
          setLanguageOptions(res.data.languages);
          
          homeCache.cachedCategories = res.data.categories;
          homeCache.cachedLanguages = res.data.languages;
        })
        .catch(err => console.error("Filter load error", err));
    }
  }, []);

  // --- 2. FETCH COURSES ---
  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = {
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm || undefined,
          category: filterCategory !== 'All' ? filterCategory : undefined,
          language: filterLanguage !== 'All' ? filterLanguage : undefined,
          level: filterLevel !== 'All' ? filterLevel : undefined,
          source_repository: filterSource !== 'All' ? filterSource : undefined,
        };

        const response = await axios.get('http://localhost:3000/courses', { params });

        setCourses(response.data.data);
        setServerTotal(response.data.total); 
        
        homeCache.data = response.data.data;
        homeCache.total = response.data.total;
        
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load courses. Please check the server.");
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchCourses();
    }, 300);

    return () => clearTimeout(timeoutId);

  }, [currentPage, searchTerm, filterCategory, filterLanguage, filterLevel, filterSource]);


  // Restore Scroll
  useEffect(() => {
    if (homeCache.scrollY > 0) {
       window.scrollTo(0, homeCache.scrollY);
    }
    
    const handleScroll = () => {
       setIsSticky(window.scrollY > 0);
       homeCache.scrollY = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync Cache
  useEffect(() => {
      homeCache.search = searchTerm;
      homeCache.level = filterLevel;
      homeCache.source = filterSource;
      homeCache.category = filterCategory;
      homeCache.language = filterLanguage;
      homeCache.page = currentPage;
  }, [searchTerm, filterLevel, filterSource, filterCategory, filterLanguage, currentPage]);

  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1); 
    setPageInput(1);
  };

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
    setPageInput(newPage); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(serverTotal / itemsPerPage);

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

  return (
    <div className="home-container">
      
      {/* Header */}
      <div className="home-header">
        <div className="header-text">
            <h1>Course Finder</h1>
            <p>Find the best learning courses from edX and Coursera</p>
        </div>
      </div>
      
      {/* Filter Bar */}
      <div className={`filter-bar ${isSticky ? 'sticky' : ''}`}>
        <input 
          type="text" 
          placeholder="Search by title..." 
          value={searchTerm} 
          onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
          className="filter-input"
        />

        <select value={filterCategory} onChange={(e) => handleFilterChange(setFilterCategory, e.target.value)} className="filter-select">
           <option value="All">All Topics</option>
           {categoryOptions.map(cat => (
             <option key={cat} value={cat}>{cat}</option>
           ))}
        </select>

        {/* DYNAMIC LANGUAGE DROPDOWN */}
        <select value={filterLanguage} onChange={(e) => handleFilterChange(setFilterLanguage, e.target.value)} className="filter-select">
          <option value="All">All Languages</option>
          {languageOptions.map(lang => (
            /* The server now sends "English", "Spanish" etc. directly */
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>

        <select value={filterLevel} onChange={(e) => handleFilterChange(setFilterLevel, e.target.value)} className="filter-select">
          <option value="All">All Levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>

        <select value={filterSource} onChange={(e) => handleFilterChange(setFilterSource, e.target.value)} className="filter-select">
          <option value="All">All Sources</option>
          <option value="edX">edX</option>
          <option value="Coursera">Coursera</option>
        </select>

        <button onClick={clearFilters} className="action-button" style={{ minWidth: '110px' }}>
          Clear Filters
        </button>
      </div>

      {loading && <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Loading...</div>}
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {!loading && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', color: '#888' }}>
            <span>Found {serverTotal} courses</span>
            <span>Page {currentPage} of {totalPages || 1}</span>
        </div>
      )}

      {/* Grid */}
      <div className="course-grid">
        {courses.map(course => (
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
            <button 
                className="pagination-btn" 
                onClick={() => handlePageChange(1)} 
                disabled={currentPage === 1}
            >
                &laquo;
            </button>
            <button 
                className="pagination-btn" 
                onClick={() => handlePageChange(Math.max(currentPage - 1, 1))} 
                disabled={currentPage === 1}
            >
                &lsaquo;
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: '#888' }}>Page</span>
                <input 
                    type="number" min="1" max={totalPages}
                    value={pageInput} 
                    onChange={(e) => setPageInput(e.target.value)}   
                    onKeyDown={handleInputKeyDown} 
                    onFocus={(e) => e.target.select()}     
                    className="page-input"
                />
                <span style={{ color: '#888' }}>of {totalPages}</span>
            </div>

            <button 
                className="pagination-btn" 
                onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))} 
                disabled={currentPage === totalPages}
            >
                &rsaquo;
            </button>
            <button 
                className="pagination-btn" 
                onClick={() => handlePageChange(totalPages)} 
                disabled={currentPage === totalPages}
            >
                &raquo;
            </button>
        </div>
      )}
    </div>
  );
}

export default Home;
