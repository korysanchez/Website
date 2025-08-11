import React from "react";
import Template from "./Template";

export default function SafeSpace() {
  const projectData = {
    title: "Safe Space",
    projectType: "Personal Project",
    heroImage: "/portfolio/projects/safe_space/title.png",
    heroDescription: "A mental health companion app to create a safe place for users.",
    duration: "January 2024 - March 2024",
    tools: ["React", "Firebase", "CSS Modules"],
    sections: [
      {
        header: "Overview",
        paragraphs: [
          "Safe Space is a companion app aimed to help users manage stress and anxiety.",
          "It includes guided meditations, journaling, and support communities."
        ],
        images: ["/portfolio/projects/safe_space/overview1.png"]
      },
      {
        header: "Overview",
        paragraphs: [
          "Safe Space is a companion app aimed to help users manage stress and anxiety.",
          "It includes guided meditations, journaling, and support communities."
        ],
        images: ["/portfolio/projects/safe_space/overview1.png"]
      },
      {
        header: "Overview",
        paragraphs: [
          "Safe Space is a companion app aimed to help users manage stress and anxiety.",
          "It includes guided meditations, journaling, and support communities."
        ],
        images: ["/portfolio/projects/safe_space/overview1.png"]
      },
      {
        header: "Motivation & Context",
        paragraphs: [
          "Mental health awareness is rising, but access to easy-to-use apps is limited.",
          "This project aims to fill that gap with a friendly UX and community focus."
        ]
      },
      // Add more sections as needed
    ],
    links: [
      { href: "https://github.com/korysanchez/safe_space", text: "GitHub Repository" },
      { href: "https://safe-space.example.com", text: "Live Demo" }
    ]
  };

  return <Template {...projectData} />;
}