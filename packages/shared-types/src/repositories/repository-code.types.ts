import type { CodeTreeNode } from './code-explorer.types.js';

export interface RepositoryBranch {
  name: string;

  sha: string;

  protected: boolean;
}

export interface RepositoryBranchesResponse {
  defaultBranch: string;

  branches: RepositoryBranch[];
}

export interface RepositoryTreeResponse {
  repositoryId: string;

  branch: string;

  sha: string;

  truncated: boolean;

  nodes: CodeTreeNode[];
}

export interface RepositoryCodeFile {
  name: string;

  path: string;

  branch: string;

  sha: string;

  size: number;

  kind: 'text' | 'image' | 'binary';

  language: string;

  mimeType: string | null;

  content: string | null;

  encoding: 'utf8' | 'base64' | null;
}

export interface RepositorySearchMatch {
  name: string;

  path: string;

  sha: string;

  size: number | null;
}

export interface RepositorySearchResponse {
  branch: string;

  query: string;

  truncated: boolean;

  matches: RepositorySearchMatch[];
}

export interface RepositoryDiffResponse {
  path: string;

  base: string;

  head: string;

  textDiff: boolean;

  language: string;

  original: RepositoryCodeFile | null;

  modified: RepositoryCodeFile | null;
}
