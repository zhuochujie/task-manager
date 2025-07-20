import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { barkKey } = await req.json();

    if (!barkKey) {
      return NextResponse.json({ error: 'Bark Key is required' }, { status: 400 });
    }

    const barkUrl = `https://api.day.app/${barkKey}`;
    const title = encodeURIComponent('测试通知');
    const body = encodeURIComponent('这是一条来自任务管理器的测试消息，您的 Bark 通知已成功配置！');
    
    const response = await fetch(`${barkUrl}/${title}/${body}?group=任务管理器`, {
      method: 'GET',
    });

    if (response.ok) {
      const barkResponse = await response.json();
      if (barkResponse.code === 200) {
        return NextResponse.json({ message: 'Test notification sent successfully.' });
      } else {
        return NextResponse.json({ error: `Bark API Error: ${barkResponse.message}` }, { status: 500 });
      }
    } else {
      const errorText = await response.text();
      return NextResponse.json({ error: `Failed to send notification: ${response.statusText}`, details: errorText }, { status: response.status });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}
