import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Tag } from '../types';
import {
  createTag as apiCreateTag,
  deleteTag as apiDeleteTag,
  getTags as apiGetTags,
  updateTag as apiUpdateTag,
  CreateTagInput,
  UpdateTagInput,
} from '../lib/api';

interface TagsContextValue {
    tags: Tag[];
    tagMap: Map<string, Tag>;
    byName: Map<string, Tag>;
    isLoading: boolean;
    error: string | null;
    refresh: (boardId: string) => Promise<void>;
    create: (input: CreateTagInput) => Promise<Tag>;
    update: (id: string, input: UpdateTagInput) => Promise<Tag>;
    remove: (id: string) => Promise<void>;
}

const TagsContext = createContext<TagsContextValue | undefined>(undefined);

export const TagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tags, setTags] = useState<Tag[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async (boardId: string) => {
        if (!boardId) {
            setTags([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const list = await apiGetTags(boardId);
            setTags(list);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            setError(e.response?.data?.message || e.message || 'Failed to load tags');
            setTags([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const create = useCallback(async (input: CreateTagInput): Promise<Tag> => {
        const tag = await apiCreateTag(input);
        setTags((prev) => {
            if (prev.some((t) => t.id === tag.id)) return prev;
            return [...prev, tag].sort((a, b) => a.name.localeCompare(b.name));
        });
        return tag;
    }, []);

    const update = useCallback(async (id: string, input: UpdateTagInput): Promise<Tag> => {
        const tag = await apiUpdateTag(id, input);
        setTags((prev) =>
            prev
                .map((t) => (t.id === id ? tag : t))
                .sort((a, b) => a.name.localeCompare(b.name)),
        );
        return tag;
    }, []);

    const remove = useCallback(async (id: string): Promise<void> => {
        await apiDeleteTag(id);
        setTags((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const tagMap = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
    const byName = useMemo(
        () => new Map(tags.map((t) => [t.name.toLowerCase(), t])),
        [tags],
    );

    // Auto-clear on unmount so switching boards forces a refresh.
    useEffect(() => () => setTags([]), []);

    return (
        <TagsContext.Provider
            value={{ tags, tagMap, byName, isLoading, error, refresh, create, update, remove }}
        >
            {children}
        </TagsContext.Provider>
    );
};

export const useTags = (): TagsContextValue => {
    const ctx = useContext(TagsContext);
    if (!ctx) throw new Error('useTags must be used within a TagsProvider');
    return ctx;
};