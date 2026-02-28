import { BoardState, Column as FEColumn, Task as FETask, SubTask as FESubTask } from '../types';

export const mapApiBoardToState = (apiBoard: any): BoardState => {
  const tasks: Record<string, FETask> = {};
  const columns: Record<string, FEColumn> = {};
  const columnOrder: string[] = [];

  // Sort columns by order
  const sortedColumns = [...apiBoard.columns].sort((a, b) => a.order - b.order);

  sortedColumns.forEach((apiCol: any) => {
    columnOrder.push(apiCol.id);
    
    // Sort tasks in column by order
    const sortedTasks = [...apiCol.tasks].sort((a, b) => a.order - b.order);
    const taskIds = sortedTasks.map(t => t.id);

    columns[apiCol.id] = {
      id: apiCol.id,
      title: apiCol.title,
      taskIds: taskIds,
      wipLimit: apiCol.wipLimit || undefined,
    };

    sortedTasks.forEach((apiTask: any) => {
      tasks[apiTask.id] = {
        id: apiTask.id,
        title: apiTask.content, // DB 'content' maps to FE 'title'
        description: apiTask.description || '',
        priority: apiTask.priority.toLowerCase() as any,
        tags: [], // Tags not yet in schema, can be added later
        subTasks: apiTask.subtasks.map((st: any) => ({
          id: st.id,
          title: st.content,
          isCompleted: st.completed,
        })),
        createdAt: apiTask.createdAt,
      };
    });
  });

  return {
    tasks,
    columns,
    columnOrder,
    selectedTaskIds: [],
  };
};
