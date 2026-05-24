import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find all Subtask records where checklistId is null and taskId is set
  const orphanSubtasks = await prisma.subtask.findMany({
    where: { checklistId: null, taskId: { not: null } },
    include: { task: true },
  });

  if (orphanSubtasks.length === 0) {
    console.log('No orphan subtasks found — nothing to migrate.');
    return;
  }

  // Group by taskId
  const byTask = new Map<string, typeof orphanSubtasks>();
  for (const st of orphanSubtasks) {
    if (!st.taskId) continue;
    if (!byTask.has(st.taskId)) byTask.set(st.taskId, []);
    byTask.get(st.taskId)!.push(st);
  }

  for (const [taskId, subtasks] of byTask) {
    // Create a default checklist named "Checklist" for this task
    const checklist = await prisma.checklist.create({
      data: { title: 'Checklist', taskId },
    });

    // Update all orphan subtasks to point to this checklist
    await prisma.subtask.updateMany({
      where: { id: { in: subtasks.map(s => s.id) } },
      data: { checklistId: checklist.id, taskId: null },
    });

    console.log(`Migrated ${subtasks.length} subtasks under task ${taskId} to checklist ${checklist.id}`);
  }

  console.log('Migration complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());