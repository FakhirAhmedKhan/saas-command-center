'use client';

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import { useParams } from 'next/navigation';

import {
  Mail,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

import { apiRequest } from '@/features/lib/api/api-client';

type WorkspaceRole =
  | 'OWNER'
  | 'ADMIN'
  | 'DEVELOPER'
  | 'VIEWER';

interface UserSummary {
  id: string;
  email: string;
  displayName: string | null;
  isActive?: boolean;
}

interface WorkspaceSummary {
  id?: string;
  workspaceId?: string;
  name?: string;
  slug?: string;
  role?: WorkspaceRole;
}

interface AuthMeResponse {
  user: UserSummary;
  workspaces: WorkspaceSummary[];
}

interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  createdAt?: string;
  updatedAt?: string;

  user?: UserSummary;

  email?: string;
  displayName?: string | null;
}

interface MembersResponse {
  data?: WorkspaceMember[];
  members?: WorkspaceMember[];
}

const MANAGEABLE_ROLES: WorkspaceRole[] = [
  'ADMIN',
  'DEVELOPER',
  'VIEWER',
];

const ROLE_LABELS: Record<
  WorkspaceRole,
  string
> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  DEVELOPER: 'Developer',
  VIEWER: 'Viewer',
};

function getRoleBadgeVariant(
  role: WorkspaceRole,
):
  | 'default'
  | 'blue'
  | 'green'
  | 'purple'
  | 'slate' {
  switch (role) {
    case 'OWNER':
      return 'purple';

    case 'ADMIN':
      return 'blue';

    case 'DEVELOPER':
      return 'green';

    case 'VIEWER':
    default:
      return 'slate';
  }
}

function normalizeMembers(
  response:
    | WorkspaceMember[]
    | MembersResponse,
): WorkspaceMember[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (Array.isArray(response.members)) {
    return response.members;
  }

  return [];
}

function getMemberEmail(
  member: WorkspaceMember,
): string {
  return (
    member.user?.email ??
    member.email ??
    'No email available'
  );
}

function getMemberName(
  member: WorkspaceMember,
): string {
  return (
    member.user?.displayName ??
    member.displayName ??
    getMemberEmail(member)
  );
}

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong';
}

export default function WorkspaceMembersPage() {
  const params =
    useParams<{
      workspaceId: string;
    }>();

  const workspaceId =
    params.workspaceId;

  const [me, setMe] =
    useState<AuthMeResponse | null>(null);

  const [members, setMembers] = useState<
    WorkspaceMember[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [email, setEmail] =
    useState('');

  const [newMemberRole, setNewMemberRole] =
    useState<WorkspaceRole>('VIEWER');

  const [addingMember, setAddingMember] =
    useState(false);

  const [
    busyMemberUserId,
    setBusyMemberUserId,
  ] = useState<string | null>(null);

  const [reloadKey, setReloadKey] =
    useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPageData(): Promise<void> {
      try {
        const [
          meResponse,
          membersResponse,
        ] = await Promise.all([
          apiRequest<AuthMeResponse>(
            '/auth/me',
          ),

          apiRequest<
            | WorkspaceMember[]
            | MembersResponse
          >(
            `/workspaces/${workspaceId}/members`,
          ),
        ]);

        if (cancelled) {
          return;
        }

        setMe(meResponse);

        setMembers(
          normalizeMembers(
            membersResponse,
          ),
        );

        setLoadError(null);
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        setLoadError(
          getErrorMessage(error),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPageData();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, reloadKey]);

  const currentWorkspace =
    useMemo(() => {
      return me?.workspaces.find(
        (workspace) =>
          (
            workspace.id ??
            workspace.workspaceId
          ) === workspaceId,
      );
    }, [me, workspaceId]);

  const currentMember =
    useMemo(() => {
      if (!me?.user.id) {
        return undefined;
      }

      return members.find(
        (member) =>
          member.userId === me.user.id ||
          member.user?.id === me.user.id,
      );
    }, [me, members]);

  const currentRole =
    currentWorkspace?.role ??
    currentMember?.role ??
    'VIEWER';

  const canManageMembers =
    currentRole === 'OWNER' ||
    currentRole === 'ADMIN';

  const workspaceName =
    currentWorkspace?.name ??
    'Workspace';

  function refreshMembers(): void {
    setLoading(true);
    setLoadError(null);
    setReloadKey(
      (currentValue) =>
        currentValue + 1,
    );
  }

  async function handleAddMember(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setFormError(
        'Email address is required',
      );
      return;
    }

    setAddingMember(true);
    setFormError(null);
    setNotice(null);

    try {
      await apiRequest(
        `/workspaces/${workspaceId}/members`,
        {
          method: 'POST',
          body: JSON.stringify({
            email: normalizedEmail,
            role: newMemberRole,
          }),
        },
      );

      setEmail('');
      setNewMemberRole('VIEWER');

      setNotice(
        'Workspace member added successfully.',
      );

      refreshMembers();
    } catch (error: unknown) {
      setFormError(
        getErrorMessage(error),
      );
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRoleChange(
    member: WorkspaceMember,
    role: WorkspaceRole,
  ): Promise<void> {
    if (member.role === 'OWNER') {
      return;
    }

    setBusyMemberUserId(
      member.userId,
    );

    setNotice(null);
    setFormError(null);

    try {
      await apiRequest(
        `/workspaces/${workspaceId}/members/${member.userId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            role,
          }),
        },
      );

      setNotice(
        `${getMemberName(
          member,
        )}'s role was updated.`,
      );

      refreshMembers();
    } catch (error: unknown) {
      setFormError(
        getErrorMessage(error),
      );
    } finally {
      setBusyMemberUserId(null);
    }
  }

  async function handleRemoveMember(
    member: WorkspaceMember,
  ): Promise<void> {
    if (member.role === 'OWNER') {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove ${getMemberName(
          member,
        )} from this workspace?`,
      );

    if (!confirmed) {
      return;
    }

    setBusyMemberUserId(
      member.userId,
    );

    setNotice(null);
    setFormError(null);

    try {
      await apiRequest(
        `/workspaces/${workspaceId}/members/${member.userId}`,
        {
          method: 'DELETE',
        },
      );

      setNotice(
        `${getMemberName(
          member,
        )} was removed from the workspace.`,
      );

      refreshMembers();
    } catch (error: unknown) {
      setFormError(
        getErrorMessage(error),
      );
    } finally {
      setBusyMemberUserId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Spinner />
          Loading workspace members...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Users className="size-6" />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-slate-900">
            Unable to load members
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            {loadError}
          </p>

          <Button
            className="mt-6"
            variant="outline"
            onClick={refreshMembers}
          >
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-600">
            {workspaceName}
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Workspace members
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Manage who can access this
            workspace and control their
            permissions.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={refreshMembers}
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </header>

      {notice ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {notice}
        </div>
      ) : null}

      {formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {formError}
        </div>
      ) : null}

      {canManageMembers ? (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <UserPlus className="size-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Add workspace member
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  The user must already have
                  a SaaS Command Center
                  account.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form
              className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end"
              onSubmit={
                handleAddMember
              }
            >
              <Input
                name="memberEmail"
                type="email"
                label="Email address"
                placeholder="developer@example.com"
                value={email}
                leadingIcon={
                  <Mail className="size-4" />
                }
                disabled={
                  addingMember
                }
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
              />

              <Select
                name="memberRole"
                label="Workspace role"
                value={newMemberRole}
                disabled={
                  addingMember
                }
                onChange={(event) =>
                  setNewMemberRole(
                    event.target
                      .value as WorkspaceRole,
                  )
                }
              >
                {MANAGEABLE_ROLES.map(
                  (role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {ROLE_LABELS[role]}
                    </option>
                  ),
                )}
              </Select>

              <Button
                type="submit"
                loading={addingMember}
                className="w-full lg:w-auto"
              >
                <UserPlus className="size-4" />
                Add member
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <Shield className="mt-0.5 size-5 shrink-0" />

          <p>
            You have{' '}
            <strong>
              {ROLE_LABELS[currentRole]}
            </strong>{' '}
            access. Only workspace owners
            and administrators can manage
            members.
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Members
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {members.length}{' '}
              {members.length === 1
                ? 'member'
                : 'members'}{' '}
              currently have access.
            </p>
          </div>

          <Badge variant="blue">
            {ROLE_LABELS[currentRole]}
          </Badge>
        </CardHeader>

        <CardContent>
          {members.length === 0 ? (
            <EmptyState
              icon={
                <Users className="size-6" />
              }
              title="No workspace members"
              description="Add your first workspace member to start collaborating."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {members.map((member) => {
                const isOwner =
                  member.role === 'OWNER';

                const isCurrentUser =
                  member.userId ===
                  me?.user.id ||
                  member.user?.id ===
                  me?.user.id;

                const isBusy =
                  busyMemberUserId ===
                  member.userId;

                return (
                  <article
                    key={member.id}
                    className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 lg:flex-row lg:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                        {getMemberName(
                          member,
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold text-slate-900">
                            {getMemberName(
                              member,
                            )}
                          </h3>

                          {isCurrentUser ? (
                            <Badge variant="slate">
                              You
                            </Badge>
                          ) : null}

                          <Badge
                            variant={getRoleBadgeVariant(
                              member.role,
                            )}
                          >
                            {
                              ROLE_LABELS[
                              member.role
                              ]
                            }
                          </Badge>
                        </div>

                        <p className="mt-1 truncate text-sm text-slate-500">
                          {getMemberEmail(
                            member,
                          )}
                        </p>
                      </div>
                    </div>

                    {canManageMembers ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {isOwner ? (
                          <div className="flex h-11 min-w-40 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                            Workspace owner
                          </div>
                        ) : (
                          <Select
                            aria-label={`Role for ${getMemberName(
                              member,
                            )}`}
                            className="min-w-40"
                            value={
                              member.role
                            }
                            disabled={
                              isBusy
                            }
                            onChange={(
                              event,
                            ) =>
                              void handleRoleChange(
                                member,
                                event.target
                                  .value as WorkspaceRole,
                              )
                            }
                          >
                            {MANAGEABLE_ROLES.map(
                              (role) => (
                                <option
                                  key={role}
                                  value={role}
                                >
                                  {
                                    ROLE_LABELS[
                                    role
                                    ]
                                  }
                                </option>
                              ),
                            )}
                          </Select>
                        )}

                        {!isOwner &&
                          !isCurrentUser ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isBusy}
                            aria-label={`Remove ${getMemberName(
                              member,
                            )}`}
                            title="Remove member"
                            onClick={() =>
                              void handleRemoveMember(
                                member,
                              )
                            }
                          >
                            {isBusy ? (
                              <Spinner className="size-4" />
                            ) : (
                              <Trash2 className="size-4 text-red-600" />
                            )}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}