import React, { useEffect } from 'react';
import Board from './components/Board';
import { useKanban } from './store/KanbanContext';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
    const { state, dispatch } = useKanban();

    // Add dummy data for first-time users
    useEffect(() => {
        if (Object.keys(state.tasks).length === 0) {
            const dummyTasks = [
                {
                    id: uuidv4(),
                    title: 'Design Premium UI',
                    description: 'Create a glassmorphism design system for the board.',
                    priority: 'high',
                    tags: ['Design', 'UI/UX'],
                    subTasks: [],
                    createdAt: new Date().toISOString(),
                },
                {
                    id: uuidv4(),
                    title: 'Implement DnD',
                    description: 'Integrate @hello-pangea/dnd for smooth task movement.',
                    priority: 'medium',
                    tags: ['Feature'],
                    subTasks: [],
                    createdAt: new Date().toISOString(),
                },
                {
                    id: uuidv4(),
                    title: 'Undo/Redo Logic',
                    description: 'Implement command pattern for global undo support.',
                    priority: 'high',
                    tags: ['Core'],
                    subTasks: [],
                    createdAt: new Date().toISOString(),
                },
            ];

            dummyTasks.forEach(task => {
                dispatch({
                    type: 'ADD_TASK',
                    payload: { columnId: 'todo', task: task as any },
                });
            });
        }
    }, []);

    return (
        <div className="min-h-screen">
            <Board />
        </div>
    );
};

export default App;
