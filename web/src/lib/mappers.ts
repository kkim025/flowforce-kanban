import { BoardState, Column as FEColumn, Task as FETask, SubTask as FESubTask, Checklist as FEChecklist, Priority } from '../types';

interface ApiSubtask {
  id: string;
  content: string;
  completed: boolean;
  checklistId: string | null;
  taskId: string | null;
}

interface ApiChecklist {
  id: string;
  title: string;
  taskId: string;
  items?: ApiSubtask[];
}

interface ApiTask {
  id: string;
  content: string;
  description: string | null;
  priority: string;
  order: number;
  columnId: string;
  createdAt: string;
  subtasks?: ApiSubtask[];
  checklists?: ApiChecklist[];
}

interface ApiColumn {
  id: string;
  title: string;
  order: number;
  boardId: string;
  tasks?: ApiTask[];
  wipLimit?: number;
}

interface ApiBoard {
  id: string;
  title: string;
  ownerId: string;
  columns?: ApiColumn[];
}

export const mapApiBoardToState = (apiBoard: ApiBoard): BoardState => {
  const tasks: Record<string, FETask> = {};
  const columns: Record<string, FEColumn> = {};
  const columnOrder: string[] = [];

  // Sort columns by order
  const sortedColumns = apiBoard.columns ? [...apiBoard.columns].sort((a, b) => a.order - b.order) : [];

  sortedColumns.forEach((apiCol: ApiColumn) => {
    columnOrder.push(apiCol.id);
    
    // Sort tasks in column by order
    const apiTasks = apiCol.tasks || [];
    const sortedTasks = [...apiTasks].sort((a, b) => a.order - b.order);
    const taskIds = sortedTasks.map(t => t.id);

    columns[apiCol.id] = {
      id: apiCol.id,
      title: apiCol.title,
      taskIds: taskIds,
      wipLimit: apiCol.wipLimit,
    };

    sortedTasks.forEach((apiTask: ApiTask) => {
      // Map checklists and their items
      const checklists: FEChecklist[] = (apiTask.checklists || []).map((cl: ApiChecklist) => ({
        id: cl.id,
        title: cl.title,
        taskId: cl.taskId,
        items: (cl.items || []).map((item: ApiSubtask) => ({
          id: item.id,
          title: item.content,
          isCompleted: item.completed,
          checklistId: item.checklistId || undefined,
        })),
      }));

      // Map standalone subtasks (those without checklistId)
      const subTasks: FESubTask[] = (apiTask.subtasks || [])
        .filter((st: ApiSubtask) => !st.checklistId)
        .map((st: ApiSubtask) => ({
          id: st.id,
          title: st.content,
          isCompleted: st.completed,
        }));

      tasks[apiTask.id] = {
        id: apiTask.id,
        title: apiTask.content, // DB 'content' maps to FE 'title'
        description: apiTask.description || '',
        priority: (apiTask.priority?.toLowerCase() as Priority) || 'medium',
        tags: [],
        subTasks: subTasks,
        checklists: checklists,
        createdAt: apiTask.createdAt,
      };
    });
  });

  return {
    tasks,
    columns,
    columnOrder,
    selectedTaskIds: [],
    viewMode: (localStorage.getItem('flowforce_view_mode') as any) || 'board',
    searchQuery: '',
  };
};
