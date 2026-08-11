export interface CodeTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'submodule';
  sha: string | null;
  size: number | null;
  children?: CodeTreeNode[];
}
