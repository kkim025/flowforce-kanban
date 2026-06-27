// Wiki API client — wraps the boards/:boardId/wiki/* endpoints.
// All methods return Promises; on 403 the response interceptor in
// api.ts already routes to /login only on 401, so 403s surface to
// callers (used to gate UI actions).

import api from './api';
import {
    WikiPage,
    WikiTreeNode,
    WikiTrashItem,
    WikiVersion,
} from '../types/wiki';

const url = (boardId: string, suffix: string = '') =>
    `/boards/${boardId}/wiki${suffix}`;

export async function getWikiTree(
    boardId: string,
): Promise<WikiTreeNode[]> {
    const res = await api.get<WikiTreeNode[]>(url(boardId));
    return res.data;
}

export async function getWikiTrash(
    boardId: string,
): Promise<WikiTrashItem[]> {
    const res = await api.get<WikiTrashItem[]>(url(boardId, '/trash'));
    return res.data;
}

export async function getWikiPage(
    boardId: string,
    pageId: string,
): Promise<WikiPage> {
    const res = await api.get<WikiPage>(
        url(boardId, `/pages/${pageId}`),
    );
    return res.data;
}

export interface CreateWikiPageInput {
    title: string;
    content: string;
    parentId?: string | null;
    slug?: string;
}

export async function createWikiPage(
    boardId: string,
    input: CreateWikiPageInput,
): Promise<WikiPage> {
    const res = await api.post<WikiPage>(
        url(boardId, '/pages'),
        input,
    );
    return res.data;
}

export interface UpdateWikiPageInput {
    title: string;
    content: string;
    slug?: string;
}

export async function updateWikiPage(
    boardId: string,
    pageId: string,
    input: UpdateWikiPageInput,
): Promise<WikiPage> {
    const res = await api.patch<WikiPage>(
        url(boardId, `/pages/${pageId}`),
        input,
    );
    return res.data;
}

export interface MoveWikiPageInput {
    parentId?: string | null;
    order: number;
}

export async function moveWikiPage(
    boardId: string,
    pageId: string,
    input: MoveWikiPageInput,
): Promise<WikiPage> {
    const res = await api.post<WikiPage>(
        url(boardId, `/pages/${pageId}/move`),
        input,
    );
    return res.data;
}

export async function archiveWikiPage(
    boardId: string,
    pageId: string,
): Promise<WikiPage> {
    const res = await api.delete<WikiPage>(
        url(boardId, `/pages/${pageId}`),
    );
    return res.data;
}

/**
 * Hard-delete (admin only). The destructive variant of archive —
 * type the page title in the UI to confirm.
 */
export async function hardDeleteWikiPage(
    boardId: string,
    pageId: string,
): Promise<void> {
    await api.delete(url(boardId, `/pages/${pageId}?hard=true`));
}

export async function restoreWikiPage(
    boardId: string,
    pageId: string,
): Promise<WikiPage> {
    const res = await api.post<WikiPage>(
        url(boardId, `/pages/${pageId}/restore`),
    );
    return res.data;
}

export async function listWikiVersions(
    boardId: string,
    pageId: string,
    limit: number = 50,
): Promise<WikiVersion[]> {
    const res = await api.get<WikiVersion[]>(
        url(boardId, `/pages/${pageId}/versions`),
        { params: { limit } },
    );
    return res.data;
}

export async function restoreWikiVersion(
    boardId: string,
    pageId: string,
    versionId: string,
): Promise<WikiPage> {
    const res = await api.post<WikiPage>(
        url(boardId, `/pages/${pageId}/versions/${versionId}/restore`),
    );
    return res.data;
}
