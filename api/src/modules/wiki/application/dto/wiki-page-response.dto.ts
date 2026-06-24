export class WikiPageResponseDto {
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

export class WikiTreeNodeDto {
  page: WikiPageResponseDto;
  children: WikiTreeNodeDto[];
}

export class WikiTrashItemDto {
  page: WikiPageResponseDto;
  breadcrumb:
    | { id: string; title: string; slug: string }[]
    | null;
}

export class WikiVersionResponseDto {
  id: string;
  pageId: string;
  revisionNo: number;
  title: string;
  content: string;
  editorId: string;
  createdAt: string;
}
