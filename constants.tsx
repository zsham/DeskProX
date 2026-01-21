
import { User, UserRole, Ticket, TicketStatus, TicketPriority, Comment } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alice Admin', email: 'alice@admin.com', role: UserRole.ADMIN, avatar: 'https://picsum.photos/seed/alice/100/100', phone: '6281234567890' },
  { id: 'u2', name: 'Bob Tech', email: 'bob@pic.com', role: UserRole.PIC, avatar: 'https://picsum.photos/seed/bob/100/100', phone: '6281234567891' },
  { id: 'u3', name: 'Charlie Client', email: 'charlie@client.com', role: UserRole.CLIENT, avatar: 'https://picsum.photos/seed/charlie/100/100', phone: '6281234567892' },
  { id: 'u4', name: 'Diana Tech', email: 'diana@pic.com', role: UserRole.PIC, avatar: 'https://picsum.photos/seed/diana/100/100', phone: '6281234567893' },
];

export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'T-1001',
    title: 'Website slow on checkout',
    description: 'The checkout page takes more than 10 seconds to load. This is affecting our conversion rate.',
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.URGENT,
    category: 'Bug',
    creatorId: 'u3',
    assignedTo: 'u2',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'T-1002',
    title: 'New laptop request',
    description: 'Need a new laptop for the upcoming project. Preferred specs: 32GB RAM.',
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    category: 'Hardware',
    creatorId: 'u3',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'T-1003',
    title: 'Password reset issue',
    description: 'User cannot reset password despite following instructions. Getting a 403 error.',
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.HIGH,
    category: 'Access',
    creatorId: 'u3',
    assignedTo: 'u4',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
  }
];

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c1',
    ticketId: 'T-1001',
    userId: 'u2',
    content: "I've checked the server logs, it seems the database query for inventory is bottlenecked.",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'c2',
    ticketId: 'T-1001',
    userId: 'u3',
    content: 'Thank you for the update. Is there an ETA for the fix?',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  }
];

export const CATEGORIES = ['Hardware', 'Software', 'Bug', 'Access', 'Network', 'Other'];
