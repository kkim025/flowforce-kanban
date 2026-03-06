# 🧞 FlowForce Kanban

FlowForce is a premium, high-performance Kanban board application designed for professional workflows. Featuring a modern Glassmorphism UI and robust state management, it provides a seamless and productive experience for managing tasks and projects.

![FlowForce Kanban](https://github.com/kkim025/flowforce-kanban/blob/development/resource/screenshot.png) *(Placeholder for screenshot)*

## ✨ Features

- **🎨 Modern Glassmorphism UI**: A premium visual design built with Tailwind CSS v4, featuring sleek transparency effects and HSL/OKLCH color palettes.
- **🧠 Advanced State Management**: 
    - Full Undo/Redo support (Ctrl+Z / Ctrl+Shift+Z) using the Command Pattern.
    - Automatic persistence to `localStorage` for seamless session recovery.
- **🛠️ Workflow Optimizations**:
    - **WIP Limits**: Visual warnings when columns exceed their work-in-progress limits.
    - **Live Search**: Instant task filtering by pressing `/`.
    - **Bulk Actions**: Multi-select tasks (Ctrl+Click) for batch move or delete operations.
- **📋 Rich Task Management**: 
    - Sub-tasks with real-time progress tracking.
    - Priority tagging and rich metadata.
- **📤 Data Portability**: Full JSON Export and Import capabilities for board backups and transfers.
- **🚀 High Performance**: Built with React 19 and Vite, utilizing memoization for buttery-smooth interactions.

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/) (TypeScript), [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [@hello-pangea/dnd](https://github.com/hello-pangea/dnd)
- **Backend**: [NestJS](https://nestjs.com/), [Prisma ORM](https://www.prisma.io/), [Passport JWT](http://www.passportjs.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (Docker)
- **State Management**: React Context API + `useReducer` (with backend sync)
- **Build Tool**: [Vite](https://vitejs.dev/)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [Docker Desktop](https://www.docker.com/) (for PostgreSQL)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation & Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/kkim025/flowforce-kanban.git
   cd flowforce-kanban
   ```

2. **Start the Database**:
   ```bash
   cd api
   docker-compose up -d
   ```

3. **Set up the Backend**:
   ```bash
   cd api
   cp .env.example .env    # Create environment file (Ensure DATABASE_URL and JWT_SECRET are set)
   npm install
   npx prisma migrate dev  # Apply migrations and sync database schema
   npx prisma generate     # Generate Prisma Client
   npm run start:dev       # API will run on http://localhost:3000
   ```

4. **Set up the Frontend**:
   Open a new terminal window:
   ```bash
   cd web
   npm install
   npm run dev             # Web app will run on http://localhost:5173
   ```

### First Time Use
After starting both servers, navigate to `http://localhost:5173/register` to create your first account and initialize your personal board.

### Build

Create a production-ready build:
```bash
npm run build
```

### Testing

Run the test suite:
```bash
npm run test
```

## 🏗️ Architecture

FlowForce follows a **Unidirectional Data Flow** architecture with a command-history layer for robust Undo/Redo functionality.

```mermaid
graph TD
    A[KanbanProvider] --> B[kanbanReducer]
    A --> C[History Management]
    B --> D[Board State]
    C --> |Undo/Redo| D
    D --> E[Board Component]
    E --> F[Column Component]
    F --> G[TaskCard Component]
    E --> H[TaskModal]
    G --> |Drag Events| E
    H --> |Dispatch Action| B
```

- **History Management**: Every state change (MOVE, ADD, UPDATE, DELETE) is captured in a history stack (`past`, `present`, `future`).
- **Persistence**: The state is automatically mirrored to `localStorage` on every change.

## ⌨️ Global Shortcuts

Maximize your productivity with these built-in shortcuts:

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Z` | Undo last action |
| `Ctrl + Shift + Z` / `Ctrl + Y` | Redo action |
| `n` | Create new task |
| `/` | Focus search bar |
| `Ctrl + Click` | Multi-select tasks for bulk actions |

## 📂 Project Structure

```text
C:\Development\flowforce-kanban
├── web
│   ├── src
│   │   ├── components\    # UI Components (Board, Column, Card, Modal)
│   │   ├── store\         # State Management (Context, Reducer, History)
│   │   ├── types\         # TypeScript interfaces and types
│   │   ├── App.tsx        # Main application entry point
│   │   └── index.css      # Tailwind v4 styles
│   └── vite.config.ts     # Vite configuration
└── GEMINI.md              # Project documentation and context
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
