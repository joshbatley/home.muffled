"use client";

import { useEffect, useState } from "react";

type ProjectSelectorProps = {
  onProjectChange: (projectName: string) => void;
  initialProject?: string;
  projectStorageKey?: string;
};

export function ProjectSelector({
  onProjectChange,
  initialProject,
  projectStorageKey
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");

  useEffect(() => {
    async function loadProjects() {
      const response = await fetch("/api/projects");

      if (!response.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      const data = (await response.json()) as { projects: string[] };
      setProjects(data.projects);
      const firstProject = data.projects[0] ?? "";
      const rememberedProject =
        projectStorageKey &&
        typeof window !== "undefined" &&
        typeof window.localStorage?.getItem === "function"
          ? window.localStorage.getItem(projectStorageKey)
          : "";
      const nextProject =
        (rememberedProject && data.projects.includes(rememberedProject)
          ? rememberedProject
          : initialProject && data.projects.includes(initialProject)
            ? initialProject
            : firstProject);
      setSelectedProject(nextProject);
      if (nextProject) {
        onProjectChange(nextProject);
      }
      setIsLoading(false);
    }

    void loadProjects();
  }, [onProjectChange, initialProject, projectStorageKey]);

  if (isLoading) {
    return <p>Loading projects...</p>;
  }

  if (hasError) {
    return <p>Failed to load projects.</p>;
  }

  return (
    <label>
      Project
      <select
        aria-label="Project"
        value={selectedProject}
        onChange={(event) => {
          setSelectedProject(event.target.value);
          onProjectChange(event.target.value);
        }}
      >
        {projects.map((project) => (
          <option key={project} value={project}>
            {project}
          </option>
        ))}
      </select>
    </label>
  );
}
