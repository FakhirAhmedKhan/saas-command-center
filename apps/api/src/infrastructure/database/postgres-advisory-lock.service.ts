import {
    Injectable,
    Logger,
    OnModuleDestroy,
} from '@nestjs/common';

import type {
    PoolClient,
} from 'pg';

import {
    Pool,
} from 'pg';

import type {
    TypedConfigService,
} from '../../config/runtime-config';

export interface DistributedLockResult<T> {
    acquired: boolean;

    value?: T;
}

interface AdvisoryLockRow {
    acquired: boolean;
}

@Injectable()
export class PostgresAdvisoryLockService
    implements OnModuleDestroy {
    private readonly logger =
        new Logger(
            PostgresAdvisoryLockService.name,
        );

    private readonly pool:
        Pool;

    constructor(
        config:
            TypedConfigService,
    ) {
        this.pool =
            new Pool({
                connectionString:
                    config.get(
                        'DATABASE_URL',
                        {
                            infer: true,
                        },
                    ),

                max: 5,

                idleTimeoutMillis:
                    30_000,

                connectionTimeoutMillis:
                    10_000,
            });
    }

    async withLock<T>(
        lockKey: string,
        callback:
            (
                client:
                    PoolClient,
            ) => Promise<T>,
    ): Promise<
        DistributedLockResult<T>
    > {
        const client =
            await this.pool
                .connect();

        let acquired =
            false;

        try {
            const result =
                await client.query<
                    AdvisoryLockRow
                >(
                    `
            SELECT
              pg_try_advisory_lock(
                hashtextextended(
                  $1,
                  0
                )
              ) AS acquired
          `,
                    [
                        lockKey,
                    ],
                );

            acquired =
                result.rows[0]
                    ?.acquired ===
                true;

            if (!acquired) {
                return {
                    acquired: false,
                };
            }

            const value =
                await callback(
                    client,
                );

            return {
                acquired: true,
                value,
            };
        } finally {
            if (acquired) {
                try {
                    await client.query(
                        `
              SELECT
                pg_advisory_unlock(
                  hashtextextended(
                    $1,
                    0
                  )
                )
            `,
                        [
                            lockKey,
                        ],
                    );
                } catch (
                error
                ) {
                    this.logger.error(
                        'Unable to release advisory lock.',

                        error instanceof
                            Error
                            ? error.stack
                            : undefined,
                    );
                }
            }

            client.release();
        }
    }

    async onModuleDestroy():
        Promise<void> {
        await this.pool.end();
    }
}