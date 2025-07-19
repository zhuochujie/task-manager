import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export async function POST(request: Request) {
  const { email, password } = await request.json();

  // Basic validation
  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { message: 'Invalid input. Password should be at least 6 characters long.' },
      { status: 400 }
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
        { message: 'Database configuration error.' },
        { status: 500 }
      );
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Check if user already exists
    const existingUsers = (await sql`
      SELECT email FROM "User" WHERE email = ${email};
    `) as { email: string }[];

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { message: 'User with this email already exists.' },
        { status: 409 } // 409 Conflict
      );
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert the new user into the database
    await sql`
      INSERT INTO "User" (email, "passwordHash")
      VALUES (${email}, ${passwordHash});
    `;

    return NextResponse.json(
      { message: 'User created successfully.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
