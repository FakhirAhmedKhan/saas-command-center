'use client';

import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    getAnalyticsProcessingStatus,
} from './analytics-processing-api';

import type {
    AnalyticsProcessingStatus,
} from './analytics-processing.types';

interface ProcessingState {
    data:
    AnalyticsProcessingStatus | null;

    loading:
    boolean;

    error:
    unknown | null;
}

export function useAnalyticsProcessing(
    workspaceId:
        string,

    websiteId:
        string,
) {
    const [
        reloadKey,
        setReloadKey,
    ] = useState(0);

    const [
        state,
        setState,
    ] =
        useState<ProcessingState>({
            data:
                null,

            loading:
                true,

            error:
                null,
        });

    const reload =
        useCallback(
            () => {
                setReloadKey(
                    (
                        current,
                    ) =>
                        current +
                        1,
                );
            },
            [],
        );

    useEffect(
        () => {
            const controller =
                new AbortController();

            let timer:
                number | undefined;

            async function load():
                Promise<void> {
                try {
                    const data =
                        await getAnalyticsProcessingStatus(
                            workspaceId,
                            websiteId,
                            controller
                                .signal,
                        );

                    if (
                        controller
                            .signal
                            .aborted
                    ) {
                        return;
                    }

                    setState({
                        data,

                        loading:
                            false,

                        error:
                            null,
                    });

                    if (
                        data.activeRun
                    ) {
                        timer =
                            window.setTimeout(
                                () => {
                                    void load();
                                },
                                5_000,
                            );
                    }
                } catch (
                error
                ) {
                    if (
                        controller
                            .signal
                            .aborted
                    ) {
                        return;
                    }

                    setState({
                        data:
                            null,

                        loading:
                            false,

                        error,
                    });
                }
            }

            setState(
                (
                    previous,
                ) => ({
                    ...previous,

                    loading:
                        previous.data ===
                        null,

                    error:
                        null,
                }),
            );

            void load();

            return () => {
                controller.abort();

                if (
                    timer !==
                    undefined
                ) {
                    window.clearTimeout(
                        timer,
                    );
                }
            };
        },
        [
            workspaceId,
            websiteId,
            reloadKey,
        ],
    );

    return {
        ...state,
        reload,
    };
}