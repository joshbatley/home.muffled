"use client";

import { useEffect, useState } from "react";

type ProjectSelectorProps = {
  onProjectChange: (projectName: string) => void;
};

export function ProjectSelector({ onProjectChange }: ProjectSelectorProps) {
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
      setSelectedProject(data.projects[0] ?? "");
      if (data.projects[0]) {
        onProjectChange(data.projects[0]);
      }
      setIsLoading(false);
    }

    void loadProjects();
  }, []);

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
