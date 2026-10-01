"use client";

import CountriesStory from "./CountriesStory";
import FlameTransition from "./FlameTransition";
import ProjectsStory from "./ProjectsStory";

/**
 * "Our Impact — numbers that prove execution".
 * Two scroll-scrubbed stories, each in its own tall wrapper with a CSS-sticky
 * scene (so it releases naturally). Only 78+ and 12+ get a story.
 */
export default function ImpactSection() {
  return (
    <section id="impact" aria-label="Our impact" className="relative z-10 overflow-x-clip" style={{ marginTop: "-130vh" }}>
      <FlameTransition />
      <ProjectsStory />
      <CountriesStory />
    </section>
  );
}
