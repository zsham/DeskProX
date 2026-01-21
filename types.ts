
export enum UserRole {
  ADMIN = 'ADMIN',
  PIC = 'PIC',
  CLIENT = 'CLIENT'
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  createdAt: string;
  isAI?: boolean;
  images?: string[]; // Array of base64 strings
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  creatorId: string;
  assignedTo?: string; // User ID of PIC
  createdAt: string;
  updatedAt: string;
  images?: string[]; // Array of base64 strings
}

export interface AppState {
  currentUser: User;
  tickets: Ticket[];
  users: User[];
  comments: Comment[];
}
