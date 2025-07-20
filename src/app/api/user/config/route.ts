import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET: Fetch the current user's configuration (including barkKey)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  try {
    const result = (await sql`
      SELECT email, "barkKey" FROM "User" WHERE id = ${userId};
    `) as { email: string; barkKey: string | null }[];
    
    if (result.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Failed to fetch user config:', error);
    return NextResponse.json({ message: 'Failed to fetch user config' }, { status: 500 });
  }
}

// PATCH: Update the current user's barkKey
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  try {
    const { barkKey } = await request.json();

    // Basic validation: ensure barkKey is a string, can be empty
    if (typeof barkKey !== 'string') {
      return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
    }

    await sql`
      UPDATE "User"
      SET "barkKey" = ${barkKey}
      WHERE id = ${userId};
    `;

    return NextResponse.json({ message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Failed to update user config:', error);
    return NextResponse.json({ message: 'Failed to update user config' }, { status: 500 });
  }
}
