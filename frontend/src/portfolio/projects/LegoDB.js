import React from "react";
import Template from "./template";
import "./projectstyles.css";

const folderPath = "/projects/LegoDB/";
const imagePaths = {
  title: folderPath + "title.png",
  iris_bin: folderPath + "iris_bin.png",
  boxes: folderPath + "boxes.jpg",
  notion: folderPath + "notion.jpg",
  piece_finder: folderPath + "piece_finder.jpg",
  piece_filter: folderPath + "piece_filter.jpg",
  container_filter: folderPath + "container_filter.jpg",
  piece_manager: folderPath + "piece_manager.png",
  set_parts: folderPath + "set_parts.jpg",
};

const legoProjectData = {
  title: "LEGO Database",
  projectType: "Personal Project",
  heroImage: imagePaths.title,
  heroDescription:
    "Tool to locate and track LEGO pieces across storage bins.",
  duration: "March 2024 - February 2025",
  tools: ["Python", "BeautifulSoup4", "Tkinter", "SQLite", "Notion", "Notion API"],
  sections: [
    {
      header: "Project Details",
      paragraphs: [], // Details are handled by the template
      secondary: true,
      isProjectDetails: true, // A special flag to handle this section
    },
    {
      header: "Overview",
      paragraphs: [
        "In March 2024, I began sorting my LEGO collection from previously color-sorted bins to a collection sorted entirely be piece. Since then, this project has evolved into a complex database to track locations with QR-code labelled bins, and over 400 compartmented sections.",
      ],
    },
    {
      header: "Iteration 1",
      paragraphs: [
        "When I first started, I had envisioned just a few small containers to hold small pieces that would get lost in the larger bins. I was often running into issues where I was trying to find a small, black piece in a huge pile of black LEGO pieces.",
        "I came home with one of these IRIS 16-Case Photo storage bins with the goal to keep a couple commonly used pieces in it for quick access.",
        "When I got the bin, however, I realized the potential for a much better system.",
      ],
      images: [imagePaths.iris_bin],
      reversed: true,
    },
    {
      header: "Motivation & Context",
      paragraphs: [
        "These bins provided ideal storage, as pieces are in seperate containers, ideal for frequent moving. They can also be easily reorganized, making future expansion or reorganization much easier.",
        "One small problem was that each larger container has 16 smaller containers. English doesn't contain clearly differentiated words for larger \"Boxes\" vs smaller \"Containers\", so I picked those two words arbitrarily.",
        "Thus, each Box has 16 Containers",
      ],
      secondary: true,
    },
    {
      header: `"Array" approach`,
      paragraphs: [
        "I began to get a few more boxes 2 at a time, but they were continually being filled by categories that I felt were necessary. I started sorting my collection down to finer levels of organization.",
        "After around 6 boxes I was finding it hard to keep track of where certains containers were located, or what pieces they had. So I started my initial plans for a more organized system.",
        "The original plan was to print out vinyl labels for each box, with each container having a letter on the back for the box it's in (Box A-Z), and a number (0-f in hexadecimal) for which location in the box it was.",
      ],
      images: [imagePaths.boxes],
      reversed: true,
    },
    {
      paragraphs: [
        "With this system in place, I would then be able to have a database to store what <em>pieces</em> were stored at each <em>location</em>.",
        "So I created a Notion database, and parsed some images online for pieces. At the time, I was using Notion for a couple other personal databases and figured it would be easiest to keep everything in one place. As well, the ability to access from my phone was an advantage that I figured would be useful.",
        "I am very grateful that a man named Tom Alphin already had a large amount of these pieces with clean looking labels and up to date information on all the pieces on his website. I used these images and data to populate my own database. You can find his website <a href=\"https://brickarchitect.com/labels/\" target=\"_blank\" class=\"link\" rel=\"noopener\">here</a>.",
      ],
      images: [imagePaths.notion],
    },
    {
      paragraphs: [
        "The Notion database did not end up being what I used. However as I needed to create a large amount of pieces for the database, I ended up learning a lot about connecting to APIs and databases. I would parse data from Tom Alphin's site, process the images, and send them through Notion's API to populate the database.",
        "Now that I had a database for the pieces, I could use the API the other way around; pulling data of pieces and locations, and writing a custom script. This script would find any set, and find the pieces I needed and where they were located among the bins. By this point I already had 18 boxes with nearly my entire collection sorted by piece.",
        "Running the script will show what containers I'll need, so I can avoid shuffling around large boxes, and just grab the smaller containers right there.",
      ],
      images: [imagePaths.piece_finder],
      reversed: true,
      secondary: true,
    },
    {
      header: "Problems",
      paragraphs: [
        "I did not continue to use Notion for long. It was slow to load and edit, and a little unintuitive. But the main motivation was that one week, the power went out in my neighborhood. When I tried to look for a piece I could not use the wifi to connect to Notion.",
        "This was frustrating, and motivated me to create my own database.",
        "As well, the mapping of piece to location was not working, and undermined one of the core functionalities of this system: that each unique container can fit into any location. Each container was marked with a Box and Position (A0, B4, etc.). This is an \"array\" based approach, where the array is the one dimensional range of box positions A0 - Zf. The database only named what pieces were located at each position.",
        "This had some advantages. Namely, the ability to easily put containers back to their position. However, it had far more drawbacks. It was hard to add pieces to the same area. For example, 2x2 bricks take up containes B2 - B8. If I got more 2x2 bricks, I'd have to expand, but not being able to move containers would mean I'd have to put them in an entirely different location.",
      ],
    },
    {
      header: "Heap approach",
      paragraphs: [
        "My new approach would unfortunately make the Notion database obsolete. However I learned a lot from it, so it was not a waste.",
        "This new database would require a new approach. Instead of mapping what pieces are at each location, we map what container are at each location, and what pieces are in each container. This would allow moving containers quite easily, so long as we keep the pieces in their container.",
        "This has some negatives, as it requires consulting the database to find the exact location of a container for retrieval and putting back. But the pros far outweight the cons.",
      ],
      reversed: true,
      secondary: true,
    },
    {
      header: "New Database",
      paragraphs: [
        "Finally, the current program is fast, local, and has more powerful functionality. I can search to locate any individual containers or pieces. I can easily hover to locate and find pieces based on categories, which dynamically change as I move or edit what pieces are located where.",
        "It also looks much prettier",
      ],
    },
    {
      header: "Image Gallery",
      entries: [
          {
          text: "Filter by pieces:",
          imgSrc: imagePaths.piece_filter,
          },
          {
          text: "Filter to locate individual container:",
          imgSrc: imagePaths.container_filter,
          },
          {
          text: "Piece manager for editing metadata on any individual piece:",
          imgSrc: imagePaths.piece_manager,
          },
      ],
      secondary: true,
    },
    {
      header: "Set building",
      paragraphs: [
        "Ultimately, a large goal of the project was to assist in making it easy to build and rebuild sets. I've added functionality that parses a set's part information, set instructions, and downloads it all for local referencing.",
        "With just a click, I can open an interactive menu to see what pieces are needed, or use the main page to see a subset of the boxes and containers required to build a set.",
      ],
      images: [imagePaths.set_parts],
    },
    {
      header: "Phone usage",
      paragraphs: [
        "One missing function from the Notion version was the ability to access information from my phone. As well, with the new container approach, it would be harder to easily find locations of pieces.",
        "I solved this issue by saving a second copy of a read-only database to my pi, and leveraged ChatGPT to write me a simple web page to read the database and find me relevant information.",
        "I'm able to use <a href=\"https://korysanchez.me/lego\" target=\"_blank\" class=\"link\" rel=\"noopener\">korysanchez.me/lego</a> on my phone to quickly search for any pieces, or locations I need to.",
      ],
      secondary: true,
    },
  ],
};


export default function LegoProject() {
  return <Template {...legoProjectData} />;
}