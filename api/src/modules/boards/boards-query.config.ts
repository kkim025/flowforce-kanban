// Query configuration for boards - separate configs for list vs detail views

// Note: When filtering board tasks by sprintId via findOne(userId, id, sprintId),
// the sprint status is NOT validated in this query config. This means tasks from
// archived sprints could appear if an archived sprintId is passed directly.
// - SprintsController.findByBoard filters out archived sprints from the sprint selector
// - Frontend SprintSelector prevents selecting archived sprints
// - If sprintId filtering by archived sprint is needed, join with Sprint table to filter by status

// Light config for list views - only columns without tasks
export const BOARD_LIST_CONFIG = {
  columns: {
    include: {
      tasks: false,
    },
  },
};

// Detail config - full deep includes for single board view
export const BOARD_DETAIL_CONFIG = {
  columns: {
    orderBy: { order: 'asc' as const },
    include: {
      tasks: {
        where: { archived: false },
        orderBy: { order: 'asc' as const },
        include: {
          checklists: {
            include: { items: true },
          },
          subtasks: true,
          comments: true,
          activities: true,
        },
      },
    },
  },
};
