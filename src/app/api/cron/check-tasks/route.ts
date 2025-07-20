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
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL environment variable.');
    return new Response('Configuration error', { status: 500 });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    const now = new Date();
    
    // 2. Find all due tasks and join with users to get their barkKey
    const tasksToNotify = (await sql`
      SELECT 
        t.id, 
        t.title, 
        u."barkKey"
      FROM "Task" t
      INNER JOIN "User" u ON t."userId" = u.id
      WHERE t."dueDate" <= ${now.toISOString()} 
        AND t."isCompleted" = false
        AND u."barkKey" IS NOT NULL 
        AND u."barkKey" != '';
    `) as { id: string; title: string; barkKey: string }[];

    if (tasksToNotify.length === 0) {
      return NextResponse.json({ success: true, message: 'No tasks to notify.' });
    }

    // 3. Send Bark notifications for each task to the respective user
    for (const task of tasksToNotify) {
      const barkKey = task.barkKey;
      const title = encodeURIComponent(`任务通知: ${task.title}`);
      const body = encodeURIComponent("此任务时间已到，请尽快处理。");
      const barkUrl = `https://api.day.app/${barkKey}/${title}/${body}?group=任务管理器&sound=electronic&volume=10&level=critical&call=1`;

      // Fire and forget the fetch request
      fetch(barkUrl);
    }

    return NextResponse.json({ success: true, tasksNotified: tasksToNotify.length });

  } catch (error) {
    console.error('Cron job failed:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
