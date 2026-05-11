// Query configuration for boards - separate configs for list vs detail views

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
