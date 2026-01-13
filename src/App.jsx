import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import your pages
import Home from './pages/home'; 
import CourseDetails from './pages/course_details'; 

function App() {
  return (
    <Router>
      {}
      <div style={{ minHeight: '100vh', padding: '0 20px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/course/:id" element={<CourseDetails />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
