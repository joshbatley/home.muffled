export type RetrievalScope = {
  project: string;
  include: string[];
  exclude: string[];
};

export function buildProjectRetrievalScope(project: string): RetrievalScope {
  return {
    project,
    include: [`${project}/**/*.md`],
    exclude: [`${project}/chats/**`]
  };
}
