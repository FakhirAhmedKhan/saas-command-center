'use client';

import {
    useState,
    type FormEvent,
} from 'react';

import Link from 'next/link';

import {
    Globe2,
    Save,
} from 'lucide-react';

import {
    Button,
} from '@/components/ui/button';

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from '@/components/ui/card';

import {
    Input,
} from '@/components/ui/input';

import {
    Select,
} from '@/components/ui/select';

import {
    Textarea,
} from '@/components/ui/textarea';

import type {
    SaasApplication,
} from '@/features/applications/application-types';

import type {
    CreateWebsitePayload,
    Website,
} from '../website-types';

import {
    getWebsiteError,
    originsToText,
    textToOrigins,
} from '../website-utils';

interface WebsiteFormProps {
    website?: Website;

    applications:
    SaasApplication[];

    initialApplicationId?: string;

    cancelHref: string;

    submitLabel: string;

    onSubmit: (
        payload:
            CreateWebsitePayload,
    ) => Promise<void>;
}

const COMMON_TIME_ZONES = [
    'UTC',
    'Asia/Dubai',
    'Asia/Qatar',
    'Asia/Karachi',
    'Asia/Kolkata',
    'Europe/London',
    'Europe/Berlin',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Australia/Sydney',
];

export function WebsiteForm({
    website,
    applications,
    initialApplicationId = '',
    cancelHref,
    submitLabel,
    onSubmit,
}: WebsiteFormProps) {
    const [name, setName] =
        useState(
            website?.name ?? '',
        );

    const [domain, setDomain] =
        useState(
            website?.domain ?? '',
        );

    const [timeZone, setTimeZone] =
        useState(
            website?.timeZone ??
            'UTC',
        );

    const [
        applicationId,
        setApplicationId,
    ] = useState(
        website?.applicationId ??
        initialApplicationId,
    );

    const [
        originsText,
        setOriginsText,
    ] = useState(
        website
            ? originsToText(
                website.allowedOrigins,
            )
            : '',
    );

    const [enabled, setEnabled] =
        useState(
            website?.enabled ?? true,
        );

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState<string | null>(
            null,
        );

    async function handleSubmit(
        event:
            FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();

        if (
            name.trim().length < 2
        ) {
            setError(
                'Website name must contain at least two characters.',
            );

            return;
        }

        if (!domain.trim()) {
            setError(
                'Website domain is required.',
            );

            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await onSubmit({
                name: name.trim(),
                domain:
                    domain.trim(),
                timeZone:
                    timeZone.trim(),
                enabled,
                applicationId:
                    applicationId ||
                    null,
                allowedOrigins:
                    textToOrigins(
                        originsText,
                    ),
            });
        } catch (
        submitError: unknown
        ) {
            setError(
                getWebsiteError(
                    submitError,
                    'Unable to save website.',
                ),
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form
            onSubmit={
                handleSubmit
            }
        >
            <Card>
                <CardHeader>
                    <div className="flex items-start gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                            <Globe2 className="size-5" />
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-slate-950">
                                Website configuration
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Configure the website identity,
                                time zone and origins permitted
                                to send analytics events.
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {error ? (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {error}
                        </div>
                    ) : null}

                    <div className="grid gap-5 md:grid-cols-2">
                        <Input
                            name="websiteName"
                            label="Website name"
                            placeholder="SaaS Command Center"
                            value={name}
                            disabled={submitting}
                            required
                            onChange={(event) =>
                                setName(
                                    event.target.value,
                                )
                            }
                        />

                        <Input
                            name="websiteDomain"
                            label="Domain"
                            placeholder="command-center.example.com"
                            hint="Enter a domain without a path."
                            value={domain}
                            disabled={submitting}
                            required
                            onChange={(event) =>
                                setDomain(
                                    event.target.value,
                                )
                            }
                        />
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <Input
                                name="websiteTimeZone"
                                label="Reporting time zone"
                                placeholder="Asia/Dubai"
                                list="website-time-zones"
                                value={timeZone}
                                disabled={submitting}
                                required
                                onChange={(event) =>
                                    setTimeZone(
                                        event.target.value,
                                    )
                                }
                            />

                            <datalist id="website-time-zones">
                                {COMMON_TIME_ZONES.map(
                                    (zone) => (
                                        <option
                                            key={zone}
                                            value={zone}
                                        />
                                    ),
                                )}
                            </datalist>
                        </div>

                        <Select
                            name="applicationId"
                            label="SaaS application"
                            value={applicationId}
                            disabled={submitting}
                            onChange={(event) =>
                                setApplicationId(
                                    event.target.value,
                                )
                            }
                        >
                            <option value="">
                                Not connected
                            </option>

                            {applications.map(
                                (application) => (
                                    <option
                                        key={
                                            application.id
                                        }
                                        value={
                                            application.id
                                        }
                                    >
                                        {
                                            application.name
                                        }
                                    </option>
                                ),
                            )}
                        </Select>
                    </div>

                    <Textarea
                        name="allowedOrigins"
                        label="Allowed origins"
                        placeholder={`https://example.com\nhttp://localhost:3000`}
                        hint="Enter one HTTP or HTTPS origin per line. Leave blank to use the website domain."
                        rows={5}
                        value={originsText}
                        disabled={submitting}
                        onChange={(event) =>
                            setOriginsText(
                                event.target.value,
                            )
                        }
                    />

                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <input
                            type="checkbox"
                            checked={enabled}
                            disabled={submitting}
                            className="mt-1 size-4"
                            onChange={(event) =>
                                setEnabled(
                                    event.target.checked,
                                )
                            }
                        />

                        <span>
                            <span className="block text-sm font-semibold text-slate-900">
                                Enable tracking
                            </span>

                            <span className="mt-1 block text-sm leading-6 text-slate-500">
                                Enabled websites will accept
                                tracking events after the Phase
                                9 ingestion API is installed.
                            </span>
                        </span>
                    </label>
                </CardContent>

                <CardFooter className="flex flex-wrap justify-end gap-3">
                    <Link
                        href={cancelHref}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        Cancel
                    </Link>

                    <Button
                        type="submit"
                        loading={submitting}
                    >
                        <Save className="size-4" />
                        {submitLabel}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}