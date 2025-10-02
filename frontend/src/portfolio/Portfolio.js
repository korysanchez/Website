import React, { useState, useEffect, useRef } from 'react';
import { Link } from "react-router-dom";
import './Portfolio.css'; // Assuming you have a CSS file with the provided styles

const isTouchDevice = () => {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
};

// Project data - you can move this to a separate file later
const projects = [
  {
    id: 1,
    title: "LEGO Database",
    description: "A database and interactive GUI to organize my lego collection and assist me in building sets",
    image: "projects/LegoDB/main.png",
    href: "/LegoDB",
    tags: [
      { text: "Python", color: "#7da87b88" },
      { text: "Personal Project", color: "rgba(95, 229, 196, 0.5)" },
      { text: "SQLite" },
      { text: "Automation" }
    ]
  },
  {
    id: 2,
    title: "Safe Space",
    description: "AI-powered video recognition that detects workplace safety violations and logs to a database with interactive data visualizations",
    image: "projects/SafeSpace/main.png",
    href: "/NotWritten",
    tags: [
      { text: "AI", color: "rgba(191, 188, 88, 0.5)" },
      { text: "Computer Vision" },
      { text: "Hackathon" }
    ]
  },
  {
    id: 3,
    title: "CGI ML",
    description: "Deployed a machine learning model on AWS services to make real-time inferences on live data streams",
    image: "projects/cgi_cloud.png",
    href: "/NotWritten",
    tags: [
      { text: "Machine Learning", color: "rgba(191, 188, 88, 0.5)" },
      { text: "Capstone Project", color: "#d74d8488" },
      { text: "AWS" },
      { text: "Docker" },
      { text: "Kafka" }
    ]
  },
  {
    id: 4,
    title: "Pixelstellar",
    description: "Created a game written fully in Rust & Bevy to write procedurally generated planets, and complex elemental interactions based on cellular-autonomata",
    image: "projects/pixelstellar.jpeg",
    href: "/NotWritten",
    tags: [
      { text: "Rust", color: "#c57ec388" },
      { text: "Class Project", color: "#d74d8488" },
      { text: "Bevy" },
      { text: "Game Design" },
      { text: "Cellular Automata" }
    ]
  },
  {
    id: 5,
    title: "Personal Website",
    description: "Personal website written and deployed on a Raspberry Pi, getting experience with networking, server setup, and deployment",
    image: "projects/website_dark.png",
    href: "/NotWritten",
    tags: [
      { text: "Personal Project", color: "rgb(95, 229, 196)" },
      { text: "Networking", color: "#6795c1" },
      { text: "Raspberry Pi" },
      { text: "HTML/CSS/JS" },
      { text: "NGINX" },
      { text: "Cloudflare" },
      { text: "Linux" }
    ]
  },
  {
    id: 6,
    title: "TCP Protocol",
    description: "Implemented the full TCP protocol, handling proper TCP connection, state handling, reliability, and congestion control.",
    image: "projects/tcp.png",
    href: "/NotWritten",
    tags: [
      { text: "C", color: "#cf6d6d" },
      { text: "Networking", color: "#6795c1" },
      { text: "Class Project", color: "#d74d84" },
      { text: "Low-level Systems" }
    ]
  },
  {
    id: 7,
    title: "Graphics Engine",
    description: "Wrote a graphics engine in pure C with OpenGL to render and solve dynamic 3D mazes, complete with lighting, viewports, perspective, and controls.",
    image: "projects/graphics.png",
    href: "/NotWritten",
    tags: [
      { text: "C", color: "#cf6d6d" },
      { text: "Class Project", color: "#d74d84" },
      { text: "OpenGL" }
    ]
  },
  {
    id: 8,
    title: "Bored Button",
    description: "A Python-based application that lets me launch games I've made myself through a custom plugin, making it easy to start new games with a single click.",
    image: "projects/bored_button.png",
    href: "/NotWritten",
    tags: [
      { text: "Personal Project", color: "rgb(95, 229, 196)" },
      { text: "Python", color: "#7da87b" },
      { text: "tkinter" },
      { text: "Plugin System" }
    ]
  }
];

// Project Card Component
function ProjectCard({ project, isDarkMode }) {
  const projectRef = useRef(null);
  const isHoveredRef = useRef(false);
  const [activeCardId, setActiveCardId] = React.useState(null);
  const [initialHiddenTags, setInitialHiddenTags] = useState(false); // controls global visibility


  const [fadedTags, setFadedTags] = useState([]);
  const timeoutRefs = useRef([]);

  const isMobile = () => window.innerWidth < 700;


  const handleCardClick = (id, link) => {
    if (false) {
      // On desktop just open the link normally, no toggling needed
      window.location.href = link;
      return;
    }

    if (activeCardId === id) {
      // Second tap: open the link
      window.location.href = link;
    } else {
      // First tap: activate the card (show hover state)
      setActiveCardId(id);
    }
  };

  useEffect(() => {
    if (!isMobile()) return; // only do this on mobile

    const observer = new IntersectionObserver(
      ([entry]) => {
      },
      {
        root: null,
        rootMargin: '-40% 0% -50% 0%', // shrink viewport vertically by 25% top and bottom
        threshold: 0.1,
      }
    );

    if (projectRef.current) {
      observer.observe(projectRef.current);
    }

    return () => {
      if (projectRef.current) {
        observer.unobserve(projectRef.current);
      }
    };
  }, []);


  const handleMouseEnter = () => {
    setInitialHiddenTags(true);
    if (!isMobile()) {
      isHoveredRef.current = true;

      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
      setFadedTags([]);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile()) {
      isHoveredRef.current = false;

      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];

      const indices = [...Array(project.tags.length).keys()];
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setFadedTags([]);

      indices.forEach((idx, order) => {
        const delay = Math.random() * 100 + order * 200; // random + stagger
        const t = setTimeout(() => {
          setFadedTags(prev => [...prev, idx]);
        }, delay);
        timeoutRefs.current.push(t);
      });
    }
  };


  // Get the correct image source based on theme for website project
  const getImageSrc = () => {
    if (project.title === "Personal Website") {
      return isDarkMode ? "projects/website_dark.png" : "projects/website.png";
    }
    return project.image;
  };

  
  console.log(project.href);
  return (
    <Link
      ref={projectRef}
      className={`project`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => handleCardClick(project.id, project.link)}
      style={{ cursor: 'pointer' }}
      to={project.href}
    >
      <div className="project-div">
        <img src={getImageSrc()} alt={`${project.title} Screenshot`} />
        <div>
          <div>
            <h2 className="project-title">{project.title}</h2>
            <p className="project-description">{project.description}</p>
          </div>
          <div className="tag-container">
            {project.tags.map((tag, index) => (
              <p
                key={index}
                className={`tag ${(!initialHiddenTags || fadedTags.includes(index)) ? "unhovered" : ""}`}
                style={tag.color ? { backgroundColor: tag.color } : {}}
              >
                {tag.text}
              </p>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

function Portfolio({ isDarkMode }) {

  const [isCollapsed, setIsCollapsed] = useState(false);
  // Mobile detection
  const isMobile = () => window.innerWidth < 700;

  // Handle resume download
  const handleResumeDownload = () => {
    window.open('/download-resume', '_blank');
  };
  return (

    <>
      {/* Floating sidebar */}
      <div className={`floating ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="floating-content">
          <h1 style={{ textAlign: 'center', fontSize: '2.5rem' }}>Kory Sanchez</h1>
          
          <img src="Kory.jpg" className="headshot" alt="Kory Sanchez" />
          
          <section id="about">
            <h2>About</h2>
            <p>
              I'm a Computer Science graduate from the University of Pittsburgh. I live in Pittsburgh, 
              and have a passion for creative problem-solving and thoughtful design. I want to use my 
              skills and knowledge to leverage technology and make a positive change in the world.
            </p>
          </section>

          <div className="links">
            <a href="https://github.com/korysanchez" target="_blank" rel="noopener noreferrer" title="Github">
              <p>Github</p>
              <img src="icons/github.png" style={{ height: '25px', width: '25px' }} alt="Github" />
            </a>
            <a href="https://www.linkedin.com/in/korysanchez/" target="_blank" rel="noopener noreferrer" title="LinkedIn">
              <p>LinkedIn</p>
              <img src="icons/linkedin.png" style={{ height: '25px', width: '25px' }} alt="LinkedIn" />
            </a>
            <a href="https://korysanchez.me/download-resume" title="Download resume">
                <p>Download resume</p>
                <img className="link-arrow" src="icons/download_button.png" style={{ height: '25px', width: '25px' }} alt="Resume"></img>
            </a>
            <a href="mailto:sanchezkoryt@gmail.com" title="Email">
              <p>Email me!</p>
              <img src="icons/email.png" style={{ height: '25px', width: '25px' }} alt="Email" />
            </a>
          </div>
        </div>

        <div className="close-button" onClick={() => setIsCollapsed(!isCollapsed)}>
          <img 
            src="icons/arrow.png" 
            style={{ height: '20px' }} 
            id="arrow" 
            alt="Toggle sidebar"
          />
        </div>
      </div>

      {/* Main content */}
      <div className={`scroll-container ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="heading">
          <h1><u>Projects</u></h1>
        </div>

        <div className="scroll-grid">
          {projects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              isDarkMode={isDarkMode}
            />
          ))}
          <div style={{ height: '20vh' }}></div>
        </div>
      </div>
    </>
  )
}

export default Portfolio;