import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

import Portfolio from './portfolio/Portfolio';  // import your Portfolio component
import Lego from './lego/Lego';      // import your Lego component


//Projects
import SafeSpace from "./portfolio/projects/SafeSpace";
import LegoDB from "./portfolio/projects/LegoDB";
import NotWritten from './portfolio/projects/notwritten';



function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const applyTheme = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);

      const root = document.documentElement.style;
      if (isDark) {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        root.setProperty('--background-color', '45, 45, 45');
        root.setProperty('--foreground-color', '233, 233, 233');
      } else {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
        root.setProperty('--background-color', '233, 233, 233');
        root.setProperty('--foreground-color', '45, 45, 45');
      }

      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        const rgb = getComputedStyle(document.documentElement)
          .getPropertyValue('--background-color')
          .trim();
        const rgbParts = rgb.split(',').map(x => parseInt(x.trim()));
        if (rgbParts.length === 3 && rgbParts.every(n => !isNaN(n))) {
          const hexColor = `#${rgbParts.map(n => n.toString(16).padStart(2, '0')).join('')}`;
          metaThemeColor.setAttribute('content', hexColor);
        }
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, []);


  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Portfolio isDarkMode={isDarkMode} />} />
          <Route path="/lego" element={<Lego />} />
          {/* Project routes */}

          <Route path="/SafeSpace"    element={<SafeSpace   />}  />
          <Route path="/LegoDB"       element={<LegoDB      />}  />
          <Route path="/NotWritten"   element={<NotWritten  />}  />
        </Routes>
      </div>
    </Router>
  );
}



export default App;