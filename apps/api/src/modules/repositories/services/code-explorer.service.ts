import { GithubCodeService, GithubRepositoryContent, GithubTreeEntry } from './github-code.service';
import { RepositoriesService } from './repositories.service';
import { BadRequestException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';

const MAX_CODE_FILE_SIZE = 1_000_000;

export interface CodeTreeNode {
  name: string;
  path: string;

  type: 'file' | 'directory' | 'submodule';

  sha: string | null;

  size: number | null;

  children?: CodeTreeNode[];
}

export interface CodeFile {
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

@Injectable()
export class CodeExplorerService {
  constructor(
    private readonly repositoriesService: RepositoriesService,

    private readonly githubCodeService: GithubCodeService,
  ) {}

  async listBranches(workspaceId: string, repositoryId: string) {
    const repository = await this.repositoriesService.findOne(workspaceId, repositoryId);

    return {
      defaultBranch: repository.defaultBranch,

      branches: await this.githubCodeService.listBranches(
        repository.installation.externalInstallationId,

        repository.owner,

        repository.name,
      ),
    };
  }

  async getTree(workspaceId: string, repositoryId: string, branch?: string) {
    const repository = await this.repositoriesService.findOne(workspaceId, repositoryId);

    const selectedBranch = this.cleanBranch(branch ?? repository.defaultBranch);

    const tree = await this.githubCodeService.getTree(
      repository.installation.externalInstallationId,

      repository.owner,

      repository.name,

      selectedBranch,
    );

    return {
      repositoryId: repository.id,

      branch: selectedBranch,

      sha: tree.sha,

      truncated: tree.truncated,

      nodes: this.buildTree(tree.entries),
    };
  }

  async search(workspaceId: string, repositoryId: string, query: string, branch?: string) {
    const repository = await this.repositoriesService.findOne(workspaceId, repositoryId);

    const selectedBranch = this.cleanBranch(branch ?? repository.defaultBranch);

    const cleanedQuery = query.trim().toLowerCase();

    if (cleanedQuery.length < 1) {
      throw new BadRequestException('Search query is required.');
    }

    const tree = await this.githubCodeService.getTree(
      repository.installation.externalInstallationId,

      repository.owner,

      repository.name,

      selectedBranch,
    );

    const matches = tree.entries
      .filter((entry) => entry.type === 'file' && entry.path.toLowerCase().includes(cleanedQuery))
      .slice(0, 100)
      .map((entry) => ({
        name: this.fileName(entry.path),

        path: entry.path,

        sha: entry.sha,

        size: entry.size,
      }));

    return {
      branch: selectedBranch,

      query: query.trim(),

      truncated: tree.truncated,

      matches,
    };
  }

  async getFile(workspaceId: string, repositoryId: string, path: string, branch?: string): Promise<CodeFile> {
    const repository = await this.repositoriesService.findOne(workspaceId, repositoryId);

    const safePath = this.validatePath(path);

    const selectedBranch = this.cleanBranch(branch ?? repository.defaultBranch);

    const file = await this.githubCodeService.getFile(
      repository.installation.externalInstallationId,

      repository.owner,

      repository.name,

      safePath,

      selectedBranch,
    );

    if (!file) {
      throw new NotFoundException('Repository file was not found.');
    }

    return this.transformFile(file, selectedBranch);
  }

  async getDiff(workspaceId: string, repositoryId: string, base: string, head: string, path: string) {
    const repository = await this.repositoriesService.findOne(workspaceId, repositoryId);

    const safePath = this.validatePath(path);

    const baseBranch = this.cleanBranch(base);

    const headBranch = this.cleanBranch(head);

    const [baseFile, headFile] = await Promise.all([
      this.githubCodeService.getFile(
        repository.installation.externalInstallationId,

        repository.owner,

        repository.name,

        safePath,

        baseBranch,
      ),

      this.githubCodeService.getFile(
        repository.installation.externalInstallationId,

        repository.owner,

        repository.name,

        safePath,

        headBranch,
      ),
    ]);

    if (!baseFile && !headFile) {
      throw new NotFoundException('The file does not exist in either branch.');
    }

    const original = baseFile ? this.transformFile(baseFile, baseBranch) : null;

    const modified = headFile ? this.transformFile(headFile, headBranch) : null;

    const textDiff = (!original || original.kind === 'text') && (!modified || modified.kind === 'text');

    return {
      path: safePath,

      base: baseBranch,

      head: headBranch,

      textDiff,

      language: modified?.language ?? original?.language ?? 'plaintext',

      original,

      modified,
    };
  }

  private transformFile(
    file: GithubRepositoryContent,

    branch: string,
  ): CodeFile {
    if (file.size > MAX_CODE_FILE_SIZE) {
      throw new PayloadTooLargeException('Files larger than 1 MB are not opened in the Code Explorer.');
    }

    const language = this.languageForFile(file.name);

    const imageMimeType = this.imageMimeType(file.name);

    if (file.encoding !== 'base64' || !file.content) {
      return {
        name: file.name,

        path: file.path,

        branch,

        sha: file.sha,

        size: file.size,

        kind: 'binary',

        language,

        mimeType: null,

        content: null,

        encoding: null,
      };
    }

    const base64 = file.content.replace(/\s/g, '');

    if (imageMimeType) {
      return {
        name: file.name,

        path: file.path,

        branch,

        sha: file.sha,

        size: file.size,

        kind: 'image',

        language: 'plaintext',

        mimeType: imageMimeType,

        content: base64,

        encoding: 'base64',
      };
    }

    const buffer = Buffer.from(base64, 'base64');

    if (this.isBinary(buffer)) {
      return {
        name: file.name,

        path: file.path,

        branch,

        sha: file.sha,

        size: file.size,

        kind: 'binary',

        language,

        mimeType: null,

        content: null,

        encoding: null,
      };
    }

    return {
      name: file.name,

      path: file.path,

      branch,

      sha: file.sha,

      size: file.size,

      kind: 'text',

      language,

      mimeType: 'text/plain',

      content: buffer.toString('utf8'),

      encoding: 'utf8',
    };
  }

  private buildTree(entries: GithubTreeEntry[]): CodeTreeNode[] {
    const roots: CodeTreeNode[] = [];

    const directoryMap = new Map<string, CodeTreeNode>();

    const sorted = [...entries].sort((left, right) => {
      const leftDepth = left.path.split('/').length;

      const rightDepth = right.path.split('/').length;

      if (leftDepth !== rightDepth) {
        return leftDepth - rightDepth;
      }

      return left.path.localeCompare(right.path);
    });

    for (const entry of sorted) {
      const node: CodeTreeNode = {
        name: this.fileName(entry.path),

        path: entry.path,

        type: entry.type,

        sha: entry.sha,

        size: entry.size,

        ...(entry.type === 'directory'
          ? {
              children: [],
            }
          : {}),
      };

      const slash = entry.path.lastIndexOf('/');

      const parentPath = slash === -1 ? null : entry.path.slice(0, slash);

      if (parentPath) {
        const parent = directoryMap.get(parentPath);

        if (parent?.children) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }

      if (entry.type === 'directory') {
        directoryMap.set(entry.path, node);
      }
    }

    this.sortNodes(roots);

    return roots;
  }

  private sortNodes(nodes: CodeTreeNode[]): void {
    nodes.sort((left, right) => {
      if (left.type === 'directory' && right.type !== 'directory') {
        return -1;
      }

      if (left.type !== 'directory' && right.type === 'directory') {
        return 1;
      }

      return left.name.localeCompare(right.name);
    });

    for (const node of nodes) {
      if (node.children) {
        this.sortNodes(node.children);
      }
    }
  }

  private validatePath(path: string): string {
    const cleaned = path.trim().replace(/\\/g, '/');

    if (!cleaned || cleaned.startsWith('/') || cleaned.includes('\0')) {
      throw new BadRequestException('Invalid repository path.');
    }

    const segments = cleaned.split('/');

    if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
      throw new BadRequestException('Invalid repository path.');
    }

    return cleaned;
  }

  private cleanBranch(branch: string): string {
    const value = branch.trim();

    if (!value || value.length > 255 || value.includes('\0')) {
      throw new BadRequestException('Invalid branch name.');
    }

    return value;
  }

  private fileName(path: string): string {
    return path.split('/').pop() ?? path;
  }

  private isBinary(buffer: Buffer): boolean {
    const sample = buffer.subarray(0, Math.min(buffer.length, 8000));

    return sample.indexOf(0) !== -1;
  }

  private imageMimeType(fileName: string): string | null {
    const extension = this.extension(fileName);

    const types: Record<string, string> = {
      png: 'image/png',

      jpg: 'image/jpeg',

      jpeg: 'image/jpeg',

      gif: 'image/gif',

      webp: 'image/webp',

      svg: 'image/svg+xml',
    };

    return types[extension] ?? null;
  }

  private languageForFile(fileName: string): string {
    const lower = fileName.toLowerCase();

    const exact: Record<string, string> = {
      dockerfile: 'dockerfile',

      makefile: 'makefile',

      '.gitignore': 'plaintext',

      '.env': 'plaintext',
    };

    if (exact[lower]) {
      return exact[lower];
    }

    const extension = this.extension(lower);

    const languages: Record<string, string> = {
      ts: 'typescript',

      tsx: 'typescript',

      js: 'javascript',

      jsx: 'javascript',

      json: 'json',

      jsonc: 'json',

      css: 'css',

      scss: 'scss',

      less: 'less',

      html: 'html',

      htm: 'html',

      md: 'markdown',

      markdown: 'markdown',

      prisma: 'plaintext',

      sql: 'sql',

      py: 'python',

      java: 'java',

      kt: 'kotlin',

      kts: 'kotlin',

      go: 'go',

      rs: 'rust',

      php: 'php',

      rb: 'ruby',

      sh: 'shell',

      bash: 'shell',

      yml: 'yaml',

      yaml: 'yaml',

      xml: 'xml',

      graphql: 'graphql',

      gql: 'graphql',

      c: 'c',

      cpp: 'cpp',

      cc: 'cpp',

      h: 'cpp',

      hpp: 'cpp',

      cs: 'csharp',
    };

    return languages[extension] ?? 'plaintext';
  }

  private extension(fileName: string): string {
    const index = fileName.lastIndexOf('.');

    if (index === -1) {
      return '';
    }

    return fileName.slice(index + 1).toLowerCase();
  }
}
