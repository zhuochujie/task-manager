import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import type { Task } from '@/lib/types';

const sql = neon(process.env.DATABASE_URL!);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    // First, verify the task belongs to the user
    const tasks = (await sql`
      SELECT * FROM "Task" WHERE id = ${taskId} AND "userId" = ${userId};
    `) as Task[];

    const task = tasks[0];
    if (!task) {
      return NextResponse.json({ message: 'Task not found or access denied' }, { status: 404 });
    }

    let updatedTask;

    if (task.type === 'one-time') {
      // For one-time tasks, just mark as completed
      const updatedTasks = (await sql`
        UPDATE "Task"
        SET "isCompleted" = true
        WHERE id = ${taskId}
        RETURNING *;
      `) as Task[];
      updatedTask = updatedTasks[0];
    } else {
      // For recurring tasks, calculate the next due date
      const now = new Date();
      const nextDueDate = new Date(now.setDate(now.getDate() + (task.intervalDays || 0)));
      
      const updatedTasks = (await sql`
        UPDATE "Task"
        SET "dueDate" = ${nextDueDate.toISOString()}
        WHERE id = ${taskId}
        RETURNING *;
      `) as Task[];
      updatedTask = updatedTasks[0];
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error(`Failed to complete task ${taskId}:`, error);
    return NextResponse.json({ message: 'Failed to complete task' }, { status: 500 });
  }
}
