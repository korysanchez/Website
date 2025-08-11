import React from "react";
import Template from "./template";
import "./projectstyles.css";

const notWrittenData = {
  title: "Not Yet Written",
  projectType: "Coming Soon",
  heroImage: "", // You can put a placeholder or leave blank
  heroDescription: "This page is under construction and will be available soon.",
  duration: "",
  tools: [],
  sections: [
  ]
};

export default function NotWritten() {
  return <Template {...notWrittenData} />;
}