import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import type { Task } from '@/lib/types';

const sql = neon(process.env.DATABASE_URL!);

// PATCH: Update an existing task
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
    const { title, dueDate, type, intervalDays } = await request.json();

    // Basic validation
    if (!title || !dueDate || !type) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const updatedTasks = (await sql`
      UPDATE "Task"
      SET 
        title = ${title},
        "dueDate" = ${dueDate},
        type = ${type},
        "intervalDays" = ${type === 'recurring' ? intervalDays : null}
      WHERE id = ${taskId} AND "userId" = ${userId}
      RETURNING *;
    `) as Task[];

    if (updatedTasks.length === 0) {
      return NextResponse.json({ message: 'Task not found or access denied' }, { status: 404 });
    }

    return NextResponse.json(updatedTasks[0]);
  } catch (error) {
    console.error(`Failed to update task ${taskId}:`, error);
    return NextResponse.json({ message: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE: Remove a task
export async function DELETE(
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
    const result = await sql`
      DELETE FROM "Task"
      WHERE id = ${taskId} AND "userId" = ${userId};
    `;

    // The 'result' from a DELETE query in neon/serverless doesn't easily tell us if a row was deleted.
    // We rely on the database to enforce the WHERE clause. If no row matches, nothing happens, which is the desired outcome.
    
    return new NextResponse(null, { status: 204 }); // 204 No Content
  } catch (error) {
    console.error(`Failed to delete task ${taskId}:`, error);
    return NextResponse.json({ message: 'Failed to delete task' }, { status: 500 });
  }
}
