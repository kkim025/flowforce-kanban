// Wiki types — mirror the API's response DTOs in
// api/src/modules/wiki/application/dto/wiki-page-response.dto.ts

export interface WikiPage {
    id: string;
    spaceId: string;
    parentId: string | null;
    slug: string;
    title: string;
    content: string;
    order: number;
    archived: boolean;
    archivedAt: string | null;
    archivedById: string | null;
    createdById: string;
    updatedById: string;
    createdAt: string;
    updatedAt: string;
}

export interface WikiTreeNode {
    page: WikiPage;
    children: WikiTreeNode[];
}

export interface WikiBreadcrumb {
    id: string;
    title: string;
    slug: string;
}

export interface WikiTrashItem {
    page: WikiPage;
    breadcrumb: WikiBreadcrumb[] | null;
}

export interface WikiVersion {
    id: string;
    pageId: string;
    revisionNo: number;
    title: string;
    content: string;
    editorId: string;
    createdAt: string;
}

// Dropdown options for the version history view.
// 0 = "All" (capped server-side at WIKI_VERSION_ALL_CEILING).
export const WIKI_VERSION_PAGE_SIZE = 50;
export const WIKI_VERSION_OPTIONS = [
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 200, label: '200' },
    { value: 0, label: 'All' },
] as const;
