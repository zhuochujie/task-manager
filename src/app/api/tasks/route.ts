import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { neon } from '@neondatabase/serverless';
import type { Task } from '@/lib/types';

const sql = neon(process.env.DATABASE_URL!);

// GET: Fetch all tasks for the logged-in user
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const tasks = (await sql`
      SELECT * FROM "Task"
      WHERE "userId" = ${userId}
      ORDER BY "dueDate" ASC;
    `) as Task[];
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ message: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST: Create a new task for the logged-in user
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const { title, type, dueDate, intervalDays } = await request.json();

    if (!title || !type || !dueDate) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    if (type === 'recurring' && !intervalDays) {
        return NextResponse.json({ message: 'Interval is required for recurring tasks' }, { status: 400 });
    }

    const newTasks = (await sql`
      INSERT INTO "Task" (title, type, "dueDate", "intervalDays", "userId")
      VALUES (${title}, ${type}, ${dueDate}, ${type === 'recurring' ? intervalDays : null}, ${userId})
      RETURNING *;
    `) as Task[];

    return NextResponse.json(newTasks[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ message: 'Failed to create task' }, { status: 500 });
  }
}
