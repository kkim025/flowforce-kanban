import { WikiPage } from '../domain/wiki-page.entity';
import { WikiPageVersion } from '../domain/wiki-page-version.entity';
import {
  WikiPageResponseDto,
  WikiVersionResponseDto,
  WikiTreeNodeDto,
  WikiTrashItemDto,
} from './dto/wiki-page-response.dto';
import type {
  WikiTreeNode,
  TrashPage,
} from '../domain/wiki.repository.interface';

export function toWikiPageResponseDto(page: WikiPage): WikiPageResponseDto {
  return {
    id: page.id,
    spaceId: page.spaceId,
    parentId: page.parentId,
    slug: page.slug,
    title: page.title,
    content: page.content,
    order: page.order,
    archived: page.archived,
    archivedAt: page.archivedAt ? page.archivedAt.toISOString() : null,
    archivedById: page.archivedById,
    createdById: page.createdById,
    updatedById: page.updatedById,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

export function toWikiVersionResponseDto(
  v: WikiPageVersion,
): WikiVersionResponseDto {
  return {
    id: v.id,
    pageId: v.pageId,
    revisionNo: v.revisionNo,
    title: v.title,
    content: v.content,
    editorId: v.editorId,
    createdAt: v.createdAt.toISOString(),
  };
}

export function toWikiTreeDto(node: WikiTreeNode): WikiTreeNodeDto {
  return {
    page: toWikiPageResponseDto(node.page),
    children: node.children.map(toWikiTreeDto),
  };
}

export function toWikiTrashDto(item: TrashPage): WikiTrashItemDto {
  return {
    page: toWikiPageResponseDto(item.page),
    breadcrumb: item.breadcrumb,
  };
}
