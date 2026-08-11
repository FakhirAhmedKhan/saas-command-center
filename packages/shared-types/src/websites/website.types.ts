export interface WebsiteApplication {
  id: string;
  name: string;
  slug: string;
  archivedAt: string | null;
}

export interface Website {
  id: string;
  workspaceId: string;
  applicationId: string | null;
  name: string;
  domain: string;
  timeZone: string;
  enabled: boolean;
  allowedOrigins: string[];
  trackingKeyPrefix: string;
  trackingKeyRotatedAt: string;
  lastEventAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  application: WebsiteApplication | null;
}

export interface WebsitePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface WebsiteListResponse {
  data: Website[];
  meta: WebsitePagination;
}

export interface WebsiteWithKeyResponse {
  website: Website;
  trackingKey: string;
}

export interface CreateWebsiteInput {
  name: string;
  domain: string;
  timeZone?: string;
  enabled?: boolean;
  allowedOrigins?: string[];
  applicationId?: string | null;
}

export interface UpdateWebsiteInput {
  name?: string;
  domain?: string;
  timeZone?: string;
  enabled?: boolean;
  allowedOrigins?: string[];
}

export interface ConnectWebsiteInput {
  applicationId: string;
}

export interface WebsiteListQueryInput {
  search?: string;
  applicationId?: string;
  connected?: boolean;
  enabled?: boolean;
  archived?: boolean;
  page?: number;
  limit?: number;
}
