import {
    BadGatewayException,
    Injectable,
} from '@nestjs/common';

import { GithubAppService } from './github-app.service';

interface GithubBranchResponse {
    name: string;

    commit: {
        sha: string;
    };

    protected: boolean;
}

interface GithubTreeEntryResponse {
    path: string;
    mode: string;
    type: 'blob' | 'tree' | 'commit';
    sha: string;
    size?: number;
}

interface GithubTreeResponse {
    sha: string;
    truncated: boolean;
    tree: GithubTreeEntryResponse[];
}

interface GithubContentResponse {
    type:
    | 'file'
    | 'dir'
    | 'symlink'
    | 'submodule';

    encoding?: string;
    content?: string;

    size: number;
    name: string;
    path: string;
    sha: string;

    download_url?: string | null;
}

export interface GithubBranch {
    name: string;
    sha: string;
    protected: boolean;
}

export interface GithubTreeEntry {
    path: string;

    type:
    | 'file'
    | 'directory'
    | 'submodule';

    sha: string;

    size: number | null;
}

export interface GithubRepositoryTree {
    sha: string;
    truncated: boolean;
    entries: GithubTreeEntry[];
}

export interface GithubRepositoryContent {
    name: string;
    path: string;
    sha: string;
    size: number;

    encoding: string | null;

    content: string | null;
}

@Injectable()
export class GithubCodeService {
    private readonly apiVersion =
        '2026-03-10';

    constructor(
        private readonly githubApp:
            GithubAppService,
    ) { }

    async listBranches(
        installationId: string,
        owner: string,
        repository: string,
    ): Promise<GithubBranch[]> {
        const token =
            this.githubApp.getInstallationAccessToken(
                installationId
            );

        const branches:
            GithubBranch[] = [];

        for (
            let page = 1;
            ;
            page += 1
        ) {
            const result =
                await this.requestJson<
                    GithubBranchResponse[]
                >(
                    await token,
                    `/repos/${encodeURIComponent(
                        owner,
                    )}/${encodeURIComponent(
                        repository,
                    )}/branches?per_page=100&page=${page}`,
                );

            for (
                const branch
                of result
            ) {
                branches.push({
                    name:
                        branch.name,

                    sha:
                        branch.commit.sha,

                    protected:
                        branch.protected,
                });
            }

            if (
                result.length <
                100
            ) {
                break;
            }
        }

        return branches;
    }

    async getTree(
        installationId: string,
        owner: string,
        repository: string,
        branch: string,
    ): Promise<GithubRepositoryTree> {
        const token =
            await this.githubApp.getInstallationAccessToken(
                installationId
            );

        const result =
            await this.requestJson<
                GithubTreeResponse
            >(
                token,
                `/repos/${encodeURIComponent(
                    owner,
                )}/${encodeURIComponent(
                    repository,
                )}/git/trees/${encodeURIComponent(
                    branch,
                )}?recursive=1`,
            );

        return {
            sha:
                result.sha,

            truncated:
                result.truncated,

            entries:
                result.tree.map(
                    (entry) => ({
                        path:
                            entry.path,

                        type:
                            this.mapTreeType(
                                entry.type,
                            ),

                        sha:
                            entry.sha,

                        size:
                            entry.size ??
                            null,
                    }),
                ),
        };
    }

    async getFile(
        installationId: string,
        owner: string,
        repository: string,
        path: string,
        ref: string,
    ): Promise<GithubRepositoryContent | null> {
        const token =
            this.githubApp.getInstallationAccessToken(
                installationId
            );

        const encodedPath =
            this.encodeRepositoryPath(
                path,
            );

        const response =
            await this.requestJsonOrNull<
                GithubContentResponse
            >(
                await token,
                `/repos/${encodeURIComponent(
                    owner,
                )}/${encodeURIComponent(
                    repository,
                )}/contents/${encodedPath}?ref=${encodeURIComponent(
                    ref,
                )}`,
            );

        if (!response) {
            return null;
        }

        if (
            response.type !==
            'file'
        ) {
            return null;
        }

        return {
            name:
                response.name,

            path:
                response.path,

            sha:
                response.sha,

            size:
                response.size,

            encoding:
                response.encoding ??
                null,

            content:
                response.content ??
                null,
        };
    }

    private async requestJson<T>(
        token: string,
        path: string,
    ): Promise<T> {
        const response =
            await fetch(
                `https://api.github.com${path}`,
                {
                    method:
                        'GET',

                    headers:
                        this.headers(
                            token,
                        ),

                    signal:
                        AbortSignal.timeout(
                            15_000,
                        ),
                },
            );

        const body =
            await response.text();

        if (
            !response.ok
        ) {
            throw new BadGatewayException(
                this.readErrorMessage(
                    body,
                    response.status,
                ),
            );
        }

        return JSON.parse(
            body,
        ) as T;
    }

    private async requestJsonOrNull<T>(
        token: string,
        path: string,
    ): Promise<T | null> {
        const response =
            await fetch(
                `https://api.github.com${path}`,
                {
                    method:
                        'GET',

                    headers:
                        this.headers(
                            token,
                        ),

                    signal:
                        AbortSignal.timeout(
                            15_000,
                        ),
                },
            );

        if (
            response.status ===
            404
        ) {
            return null;
        }

        const body =
            await response.text();

        if (
            !response.ok
        ) {
            throw new BadGatewayException(
                this.readErrorMessage(
                    body,
                    response.status,
                ),
            );
        }

        return JSON.parse(
            body,
        ) as T;
    }

    private headers(
        token: string,
    ): Record<string, string> {
        return {
            Accept:
                'application/vnd.github+json',

            Authorization:
                `Bearer ${token}`,

            'X-GitHub-Api-Version':
                this.apiVersion,

            'User-Agent':
                'saas-command-center',
        };
    }

    private encodeRepositoryPath(
        path: string,
    ): string {
        return path
            .split('/')
            .map(
                (
                    segment,
                ) =>
                    encodeURIComponent(
                        segment,
                    ),
            )
            .join('/');
    }

    private mapTreeType(
        type:
            GithubTreeEntryResponse['type'],
    ):
        | 'file'
        | 'directory'
        | 'submodule' {
        if (
            type ===
            'tree'
        ) {
            return 'directory';
        }

        if (
            type ===
            'commit'
        ) {
            return 'submodule';
        }

        return 'file';
    }

    private readErrorMessage(
        body: string,
        status: number,
    ): string {
        try {
            const parsed =
                JSON.parse(
                    body,
                ) as {
                    message?:
                    string;
                };

            return (
                parsed.message ??
                `GitHub request failed with status ${status}.`
            );
        } catch {
            return `GitHub request failed with status ${status}.`;
        }
    }
}