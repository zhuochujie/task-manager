export interface Task {
  id: string;
  userId: string;
  title: string;
  type: 'one-time' | 'recurring';
  dueDate: string;
  isCompleted: boolean;
  intervalDays: number | null;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
}
