/* eslint-disable @typescript-eslint/no-unused-vars */
export class ApiError extends Error {
    static fromResponse(_response: Response) {
        throw new Error('Method not implemented.');
    }
    constructor(
        message: string,
        public readonly status: number,
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'Something went wrong. Please try again.';
}
