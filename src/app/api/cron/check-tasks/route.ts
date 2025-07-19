import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import type { Task } from '@/lib/types';

export async function GET(request: Request) {
  // 1. Authenticate the cron job request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Ensure required environment variables are set
  if (!process.env.DATABASE_URL || !process.env.BARK_KEY) {
    console.error('Missing DATABASE_URL or BARK_KEY environment variables.');
    return new Response('Configuration error', { status: 500 });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    const now = new Date();
    
    // 2. Find all tasks that are due and not completed.
    const tasksToNotify = (await sql`
      SELECT id, title FROM "Task"
      WHERE "dueDate" <= ${now.toISOString()} AND "isCompleted" = false;
    `) as Pick<Task, 'id' | 'title'>[];

    if (tasksToNotify.length === 0) {
      return NextResponse.json({ success: true, message: 'No tasks to notify.' });
    }

    // 3. Send Bark notifications for each task
    for (const task of tasksToNotify) {
      const barkKey = process.env.BARK_KEY;
      const title = encodeURIComponent(`任务到期: ${task.title}`);
      const body = encodeURIComponent("此任务已到期，请尽快处理。");
      const barkUrl = `https://api.day.app/${barkKey}/${title}/${body}?group=任务管理器`;

      // Fire and forget the fetch request
      let res = await fetch(barkUrl);
      res = await res.json();
      console.log(res);
    }

    return NextResponse.json({ success: true, tasksNotified: tasksToNotify.length });

  } catch (error) {
    console.error('Cron job failed:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
