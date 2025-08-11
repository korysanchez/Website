// Template.jsx

import React, { useState, useEffect, useRef } from "react";
import "./projectstyles.css";

export default function Template({
  title,
  projectType,
  heroImage,
  heroDescription,
  duration,
  tools,
  sections,
}) {
  const [modalImage, setModalImage] = useState(null);

  const openModal = (imageSrc) => {
    setModalImage(imageSrc);
  };

  const closeModal = (e) => {
    if (e.target.className === "image-modal-overlay" || e.target.className === "image-modal-content") {
        setModalImage(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key) {
        setModalImage(null);
      }
    };  
    window.addEventListener("keydown", handleKeyDown);  
    // Clean up on unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);


  // Fade-in project effect when scrolled beyond certain point
  const fadeTargetRef = useRef(null);
  
  useEffect(() => {
    const scrollContainer = document.body;
    if (!scrollContainer) {
      console.warn("Scroll container not found!");
      return;
    }

    const fadeTarget = fadeTargetRef.current;
    if (!fadeTarget) {
      console.warn("fadeTargetRef is null!");
      return;
    }

    // Run once on load to set transition and add loaded class
    const onLoad = () => {
      console.log("Window loaded");
      fadeTarget.style.transitionProperty = "opacity, transform";

      const projectType = document.querySelector(".project-type");
      if (projectType) {
        projectType.classList.add("loaded");
      }
    };

    // Scroll event handler
    const onScroll = () => {
      const fadeTarget = fadeTargetRef.current;
      if (!fadeTarget) return;

      const firstSection = document.querySelector('.section');
      if (!firstSection) return;

      const onScroll = () => {
        const scrollTop = document.body.scrollTop || document.documentElement.scrollTop;

        // Get the bottom position of the first section relative to the document top
        const firstSectionBottom = firstSection.offsetTop + firstSection.offsetHeight;

        // When scrollTop passes firstSectionBottom, fade in
        if (scrollTop >= firstSectionBottom - 100) {
          fadeTarget.classList.add('visible');
        } else {
          fadeTarget.classList.remove('visible');
        }
      };

      window.addEventListener('scroll', onScroll);

      // Call once on mount in case page is already scrolled
      onScroll();

      return () => {
        window.removeEventListener('scroll', onScroll);
      };
    };

    window.addEventListener("load", onLoad);
    scrollContainer.addEventListener("scroll", onScroll);

    // Call onLoad manually in case load already happened
    if (document.readyState === "complete") {
      onLoad();
    }

    // Cleanup on unmount
    return () => {
      window.removeEventListener("load", onLoad);
      scrollContainer.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <>
      <div className="project-page">
      {/* Page Header (remains the same) */}
      <header className="page-header">
        <span id="name" className="link"><a href="/">Kory Sanchez</a></span>
        <span className="title" ref={fadeTargetRef} style={{ cursor: "unset" }}>{title}</span>
      </header>

      {/* Hero Section (remains the same) */}
      <div className="section">
        <header className="project-header">
          <div className="project-type" data-text={projectType}>{projectType}</div>

          <div className="project-hero" style={{ display: "block" }}>
            <div className="project-logo-container">
              <img src={heroImage} className="modal-trigger" alt={`${title} Logo`} style={{ width: "80%", margin: "0 auto", display: heroImage ? "block" : "none", cursor: heroImage ? "zoom-in" : "default" }} onClick={() => openModal(heroImage)}/>
            </div>

            <h1 style={{ fontSize: "4rem", textAlign: "center" }}>{title}</h1>
            <p className="hero-project-description">{heroDescription}</p>
          </div>
        </header>
      </div>

      {sections.map(({ header, paragraphs, images, reversed, secondary, isProjectDetails, entries }, i) => (
        <div className={secondary ? "section-secondary" : "section"} key={i}>
            {isProjectDetails ? (
            <section>
                <div className="section-header"><h2>Project Details</h2></div>
                <div>
                <p><strong>Duration:</strong> {duration}</p>
                <p><strong>Tools:</strong> {tools.join(", ")}</p>
                </div>
            </section>
            ) : (
            <section className={reversed ? "reversed" : ""}>
                {header === "Image Gallery" && entries ? (
                <div className="image_gallery">
                    {entries.map(({ text, imgSrc }, idx) => (
                    <div key={idx} style={{ margin: "1rem 0", textAlign: "center" }}>
                        <p>{text}</p>
                        <img
                          src={imgSrc}
                          alt={text}
                          style={{ width: "100%", margin: "1rem auto" }}
                          className="modal-trigger"
                          onClick={() => openModal(imgSrc)}
                        />
                    </div>
                    ))}
                </div>
                ) : (
                <>
                
                    {(header || (!reversed && images && images.length > 0)) && (
                      <div className={reversed && images ? "section-header" : ""}>
                          {header && <h2>{header}</h2>}
                          {!reversed && images && images.length > 0 && (
                              <div className="center_img">
                                  {images.map((src, idx) => (
                                      <img
                                          key={idx}
                                          src={src}
                                          className="modal-trigger"
                                          alt=""
                                          style={{
                                              width: "auto",
                                              maxWidth: "100%",
                                              height: "auto",
                                              margin: "1rem 0"
                                          }}
                                          onClick={() => openModal(src)}
                                      />
                                  ))}
                              </div>
                          )}
                      </div>
                  )}
                    <div>
                    {paragraphs && paragraphs.map((p, idx) => <p key={idx} dangerouslySetInnerHTML={{ __html: p }} />)}
                    {reversed && images && (
                        <div className="center_img">
                        {images.map((src, idx) => (
                            <img
                            key={idx}
                            src={src}
                            className="modal-trigger"
                            alt=""
                            style={{ width: "auto", maxWidth: "100%", height: "auto", margin: "1rem 0" }}
                            onClick={() => openModal(src)}
                            />
                        ))}
                        </div>
                    )}
                    </div>
                </>
                )}
            </section>
            )}
        </div>
        ))}
        {sections && sections.length > 0 && (
          <div className="section-secondary"></div>
        )}
    </div>

      {/* The modal is only rendered when modalImage is not null */}
      {/* onClick={(e) => e.stopPropagation()} */}
      {modalImage && (
        <div className="image-modal-overlay" onClick={closeModal}>
          <img
            src={modalImage}
            alt="Full-screen view"
            className="image-modal-content"
            onClick={closeModal}
          />
        </div>
      )}
    </>
  );
}