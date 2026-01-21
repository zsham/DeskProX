
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { UserRole, Ticket, User, Comment, TicketStatus, TicketPriority } from './types';
import { MOCK_USERS, MOCK_TICKETS, MOCK_COMMENTS } from './constants';
import { 
  IconDashboard, 
  IconTicket, 
  IconPlus, 
  IconSparkles,
  IconChevronDown,
  IconPaperclip,
  IconImage
} from './components/Icons';
import { classifyTicket, summarizeTicket, suggestResponse } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Components ---

const Badge = ({ children, color = "gray" }: { children?: React.ReactNode, color?: string }) => {
  const colors: Record<string, string> = {
    gray: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
};

// Image Viewer Overlay
const ImageViewer = ({ src, onClose }: { src: string, onClose: () => void }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-10 animate-in fade-in duration-200" onClick={onClose}>
    <button onClick={onClose} className="absolute top-6 right-6 text-white text-3xl hover:text-slate-300 transition-colors">&times;</button>
    <img src={src} className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300" alt="Full view" />
  </div>
);

// --- Login Component ---

const Login: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      onLogin(user);
    } else {
      setError('User not found. Try one of the demo accounts below.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-black p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex p-3 bg-indigo-600 rounded-2xl shadow-lg mb-4">
            <IconSparkles className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">DeskProX</h1>
          <p className="text-indigo-200 mt-2">Intelligent Helpdesk System</p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="e.g. alice@admin.com"
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
            />
            {error && <p className="text-rose-400 text-xs mt-2 ml-1">{error}</p>}
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-900/40 transition-all active:scale-95"
          >
            Sign In
          </button>
        </form>

        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
            <span className="bg-[#1a1c2e] px-4 text-white/40">Demo Quick Login</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {MOCK_USERS.map(user => (
            <button
              key={user.id}
              onClick={() => onLogin(user)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group text-left"
            >
              <img src={user.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-indigo-500/50" />
              <div>
                <p className="text-white font-bold text-sm group-hover:text-indigo-300 transition-colors">{user.name}</p>
                <p className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">{user.role}</p>
              </div>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tickets'>('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  // Filter tickets based on role
  const filteredTickets = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.ADMIN) return tickets;
    if (currentUser.role === UserRole.PIC) return tickets.filter(t => t.assignedTo === currentUser.id);
    return tickets.filter(t => t.creatorId === currentUser.id);
  }, [tickets, currentUser]);

  const selectedTicket = useMemo(() => 
    tickets.find(t => t.id === selectedTicketId), [tickets, selectedTicketId]);

  const ticketComments = useMemo(() => 
    comments.filter(c => c.ticketId === selectedTicketId), [comments, selectedTicketId]);

  // Auth Handlers
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSelectedTicketId(null);
    setActiveTab('dashboard');
  };

  // Ticket Handlers
  const handleAddTicket = (newTicket: Ticket) => {
    setTickets([newTicket, ...tickets]);
    setIsModalOpen(false);
  };

  const handleUpdateStatus = (ticketId: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t));
  };

  const handleAssign = (ticketId: string, picId: string) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, assignedTo: picId, updatedAt: new Date().toISOString() } : t));
  };

  const handleAddComment = (ticketId: string, content: string, images?: string[]) => {
    if (!currentUser) return;
    const newComment: Comment = {
      id: `c-${Date.now()}`,
      ticketId,
      userId: currentUser.id,
      content,
      images,
      createdAt: new Date().toISOString()
    };
    setComments([...comments, newComment]);
  };

  if (!isAuthenticated || !currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 animate-in fade-in duration-700">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-950 text-white flex flex-col">
        <div className="p-6 border-b border-indigo-900 flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-lg shadow-xl shadow-indigo-600/20">
            <IconSparkles className="text-indigo-600" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">DeskProX</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'dashboard' ? 'bg-indigo-600 shadow-lg text-white' : 'text-indigo-200 hover:bg-indigo-900/50 hover:text-white'
            }`}
          >
            <IconDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => { setActiveTab('tickets'); setSelectedTicketId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'tickets' ? 'bg-indigo-600 shadow-lg text-white' : 'text-indigo-200 hover:bg-indigo-900/50 hover:text-white'
            }`}
          >
            <IconTicket className="w-5 h-5" />
            <span className="font-medium">All Tickets</span>
          </button>
        </nav>

        <div className="p-4 border-t border-indigo-900">
          <div className="flex items-center gap-3 mb-6 p-2 rounded-xl bg-white/5 border border-white/5">
            <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full border-2 border-indigo-500 shadow-inner" />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{currentUser.name}</p>
              <p className="text-[10px] text-indigo-300 capitalize font-bold tracking-widest">{currentUser.role}</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-rose-500 hover:border-rose-400 transition-all group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-bold text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8 relative">
        {activeTab === 'dashboard' ? (
          <DashboardView tickets={tickets} currentUser={currentUser} onSelectTicket={(id) => { setSelectedTicketId(id); setActiveTab('tickets'); }} />
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            <header className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Helpdesk Support</h2>
                <p className="text-slate-500">Manage and resolve tickets seamlessly.</p>
              </div>
              {currentUser.role === UserRole.CLIENT && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md flex items-center gap-2 transition-transform active:scale-95"
                >
                  <IconPlus className="w-5 h-5" />
                  New Ticket
                </button>
              )}
            </header>

            <div className="grid grid-cols-12 gap-6">
              {/* Ticket List Column */}
              <div className={`${selectedTicketId ? 'col-span-4' : 'col-span-12'} transition-all duration-300`}>
                <TicketList 
                  tickets={filteredTickets} 
                  selectedId={selectedTicketId} 
                  onSelect={setSelectedTicketId} 
                  compact={!!selectedTicketId}
                />
              </div>

              {/* Ticket Detail Column */}
              {selectedTicketId && selectedTicket && (
                <div className="col-span-8 animate-in slide-in-from-right duration-300">
                  <TicketDetail 
                    ticket={selectedTicket} 
                    comments={ticketComments}
                    currentUser={currentUser}
                    onAddComment={handleAddComment}
                    onUpdateStatus={handleUpdateStatus}
                    onAssign={handleAssign}
                    onViewImage={setViewerImage}
                    users={MOCK_USERS}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* New Ticket Modal */}
      {isModalOpen && (
        <NewTicketModal 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleAddTicket} 
          creatorId={currentUser.id} 
        />
      )}

      {/* Fullscreen Image Viewer */}
      {viewerImage && (
        <ImageViewer src={viewerImage} onClose={() => setViewerImage(null)} />
      )}
    </div>
  );
};

// --- View Components ---

const DashboardView = ({ tickets, currentUser, onSelectTicket }: { tickets: Ticket[], currentUser: User, onSelectTicket: (id: string) => void }) => {
  const stats = useMemo(() => {
    const open = tickets.filter(t => t.status === TicketStatus.OPEN).length;
    const inProgress = tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length;
    const resolved = tickets.filter(t => t.status === TicketStatus.RESOLVED).length;
    const urgent = tickets.filter(t => t.priority === TicketPriority.URGENT).length;

    return [
      { label: 'Open', value: open, color: '#f59e0b', bg: 'bg-amber-50' },
      { label: 'In Progress', value: inProgress, color: '#3b82f6', bg: 'bg-blue-50' },
      { label: 'Resolved', value: resolved, color: '#10b981', bg: 'bg-emerald-50' },
      { label: 'Urgent', value: urgent, color: '#ef4444', bg: 'bg-rose-50' },
    ];
  }, [tickets]);

  const recentTickets = useMemo(() => {
    let filtered = [...tickets];
    if (currentUser.role === UserRole.CLIENT) filtered = filtered.filter(t => t.creatorId === currentUser.id);
    if (currentUser.role === UserRole.PIC) filtered = filtered.filter(t => t.assignedTo === currentUser.id);
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  }, [tickets, currentUser]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-800">Welcome back, {currentUser.name.split(' ')[0]} 👋</h2>
        <p className="text-slate-500">Here's what's happening today in the helpdesk.</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(stat => (
          <div key={stat.label} className={`${stat.bg} p-6 rounded-2xl border border-white shadow-sm hover:shadow-md transition-shadow`}>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            Ticket Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-4">Your Recent Activity</h3>
          <div className="space-y-4">
            {recentTickets.map(t => (
              <button 
                key={t.id}
                onClick={() => onSelectTicket(t.id)}
                className="w-full text-left group hover:bg-slate-50 p-3 -mx-3 rounded-xl transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-mono font-bold text-indigo-500">{t.id}</span>
                  <Badge color={t.priority === TicketPriority.URGENT ? 'red' : t.priority === TicketPriority.HIGH ? 'yellow' : 'gray'}>
                    {t.priority}
                  </Badge>
                </div>
                <h4 className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{t.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                   {t.images && t.images.length > 0 && <IconPaperclip className="w-3 h-3 text-indigo-400" />}
                </div>
              </button>
            ))}
            {recentTickets.length === 0 && (
              <p className="text-xs text-slate-400 italic py-4">No recent tickets assigned to you.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TicketList = ({ tickets, selectedId, onSelect, compact }: { tickets: Ticket[], selectedId: string | null, onSelect: (id: string) => void, compact?: boolean }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-700">Tickets ({tickets.length})</h3>
        <div className="flex gap-2">
           <div className="relative">
              <input type="text" placeholder="Search..." className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              <svg className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
        </div>
      </div>
      <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {tickets.map(ticket => {
          const isSelected = selectedId === ticket.id;
          const statusColors: Record<string, string> = {
            OPEN: 'blue',
            IN_PROGRESS: 'yellow',
            RESOLVED: 'green',
            CLOSED: 'gray'
          };
          const priorityColors: Record<string, string> = {
            LOW: 'gray',
            MEDIUM: 'blue',
            HIGH: 'yellow',
            URGENT: 'red'
          };

          return (
            <button
              key={ticket.id}
              onClick={() => onSelect(ticket.id)}
              className={`w-full text-left p-4 transition-all hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/50 border-r-4 border-indigo-600 shadow-inner' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-mono font-black text-slate-400 tracking-tighter uppercase">{ticket.id}</span>
                <div className="flex gap-1.5">
                  {ticket.images && ticket.images.length > 0 && (
                    <span className="p-1 bg-slate-100 rounded text-slate-500">
                      <IconImage className="w-3 h-3" />
                    </span>
                  )}
                  <Badge color={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                </div>
              </div>
              <h4 className={`text-sm font-bold mb-2 leading-tight ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                {ticket.title}
              </h4>
              
              {!compact && (
                <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                  {ticket.description}
                </p>
              )}
              
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                   <Badge color={statusColors[ticket.status]}>{ticket.status.replace('_', ' ')}</Badge>
                   <span className="text-[10px] text-slate-400 font-medium">#{ticket.category}</span>
                </div>
                <span className="text-[10px] text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
            </button>
          );
        })}
        {tickets.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-slate-400 text-sm">No tickets found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TicketDetail = ({ 
  ticket, 
  comments, 
  currentUser, 
  onAddComment, 
  onUpdateStatus, 
  onAssign,
  onViewImage,
  users 
}: { 
  ticket: Ticket, 
  comments: Comment[], 
  currentUser: User, 
  onAddComment: (tid: string, c: string, imgs?: string[]) => void,
  onUpdateStatus: (tid: string, s: TicketStatus) => void,
  onAssign: (tid: string, uid: string) => void,
  onViewImage: (src: string) => void,
  users: User[]
}) => {
  const [newComment, setNewComment] = useState('');
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [suggestedReply, setSuggestedReply] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAiAction = async (type: 'summarize' | 'suggest') => {
    setIsAiLoading(true);
    if (type === 'summarize') {
      const summary = await summarizeTicket(ticket, comments);
      setAiSummary(summary || "No summary available.");
    } else {
      const suggest = await suggestResponse(ticket, comments);
      setSuggestedReply(suggest || "No suggestion available.");
    }
    setIsAiLoading(false);
  };

  const handleApplySuggestion = () => {
    if (suggestedReply) {
      setNewComment(suggestedReply);
      setSuggestedReply(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCommentImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const creator = users.find(u => u.id === ticket.creatorId);
  const pic = users.find(u => u.id === ticket.assignedTo);
  const availablePics = users.filter(u => u.role === UserRole.PIC);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col h-[80vh] overflow-hidden animate-in zoom-in-95 duration-300">
      {/* Detail Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-indigo-500 uppercase tracking-widest">{ticket.id}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">Reported by {creator?.name}</span>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{ticket.title}</h3>
          </div>
          <div className="flex gap-2">
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PIC) && (
              <select 
                value={ticket.status} 
                onChange={(e) => onUpdateStatus(ticket.id, e.target.value as TicketStatus)}
                className="text-xs font-bold border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm"
              >
                {Object.values(TicketStatus).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            )}
            {currentUser.role === UserRole.ADMIN && (
              <select 
                value={ticket.assignedTo || ''} 
                onChange={(e) => onAssign(ticket.id, e.target.value)}
                className="text-xs font-bold border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm"
              >
                <option value="">Assign PIC...</option>
                {availablePics.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 py-3 px-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-900/60 uppercase tracking-wider">PIC:</span>
            {pic ? (
              <div className="flex items-center gap-2">
                <img src={pic.avatar} className="w-5 h-5 rounded-full" alt="" />
                <span className="text-xs font-bold text-indigo-900">{pic.name}</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-rose-600">Unassigned</span>
            )}
          </div>
          <div className="w-px h-4 bg-indigo-200" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-900/60 uppercase tracking-wider">Priority:</span>
            <Badge color={ticket.priority === TicketPriority.URGENT ? 'red' : 'yellow'}>{ticket.priority}</Badge>
          </div>
        </div>
      </div>

      {/* Detail Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Issue Description */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 italic text-slate-700 leading-relaxed relative">
           <span className="absolute -top-3 left-6 bg-slate-50 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Report</span>
           <p className="mb-4">{ticket.description}</p>
           {ticket.images && ticket.images.length > 0 && (
             <div className="flex flex-wrap gap-2 pt-2">
               {ticket.images.map((img, i) => (
                 <img 
                    key={i} 
                    src={img} 
                    onClick={() => onViewImage(img)}
                    className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:scale-105 transition-transform cursor-zoom-in" 
                    alt="Report" 
                 />
               ))}
             </div>
           )}
        </div>

        {/* AI Insight Section */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <button 
              disabled={isAiLoading}
              onClick={() => handleAiAction('summarize')}
              className="flex items-center gap-2 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors disabled:opacity-50 shadow-sm"
            >
              <IconSparkles className="w-3.5 h-3.5" />
              AI Summarize
            </button>
            {currentUser.role !== UserRole.CLIENT && (
              <button 
                disabled={isAiLoading}
                onClick={() => handleAiAction('suggest')}
                className="flex items-center gap-2 text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors disabled:opacity-50 shadow-sm"
              >
                <IconSparkles className="w-3.5 h-3.5" />
                AI Suggest Reply
              </button>
            )}
          </div>

          {aiSummary && (
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-xs text-indigo-900 relative animate-in fade-in slide-in-from-top-2">
              <button onClick={() => setAiSummary(null)} className="absolute top-2 right-2 text-indigo-300 hover:text-indigo-600 p-1">&times;</button>
              <p className="font-bold mb-1 flex items-center gap-1.5">
                <IconSparkles className="w-3 h-3" />
                Gemini Summary
              </p>
              {aiSummary}
            </div>
          )}

          {suggestedReply && (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-xs text-emerald-900 relative animate-in fade-in slide-in-from-top-2">
              <button onClick={() => setSuggestedReply(null)} className="absolute top-2 right-2 text-emerald-300 hover:text-emerald-600 p-1">&times;</button>
              <p className="font-bold mb-1 flex items-center gap-1.5">
                <IconSparkles className="w-3 h-3" />
                Gemini Suggestion
              </p>
              <p className="italic mb-2 leading-relaxed">"{suggestedReply}"</p>
              <button 
                onClick={handleApplySuggestion}
                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
              >
                Apply Suggestion
              </button>
            </div>
          )}
        </div>

        {/* Comments Feed */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Activity History</h4>
          {comments.map(c => {
            const commenter = users.find(u => u.id === c.userId);
            const isMe = c.userId === currentUser.id;
            return (
              <div key={c.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                <img src={commenter?.avatar} className="w-8 h-8 rounded-full border border-white shadow-sm mt-1" alt="" />
                <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                  isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-50 text-slate-700 rounded-tl-none border border-slate-100'
                }`}>
                  <div className={`flex items-center gap-2 mb-1 ${isMe ? 'justify-end' : ''}`}>
                    <span className="text-[10px] font-bold opacity-80">{commenter?.name}</span>
                    <span className="text-[9px] opacity-60">•</span>
                    <span className="text-[9px] opacity-60">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{c.content}</p>
                  {c.images && c.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {c.images.map((img, idx) => (
                        <img 
                          key={idx} 
                          src={img} 
                          onClick={() => onViewImage(img)}
                          className={`w-24 h-24 object-cover rounded-lg border shadow-sm cursor-zoom-in hover:brightness-110 transition-all ${isMe ? 'border-indigo-400' : 'border-slate-200'}`} 
                          alt="Attachment" 
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer / Input */}
      <div className="p-4 border-t border-slate-100 bg-white">
        {commentImages.length > 0 && (
          <div className="flex gap-2 mb-3 px-2 overflow-x-auto py-2">
            {commentImages.map((img, i) => (
              <div key={i} className="relative flex-shrink-0 group">
                <img src={img} className="w-16 h-16 object-cover rounded-lg border border-slate-200" alt="Preview" />
                <button 
                  onClick={() => setCommentImages(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (newComment.trim() || commentImages.length > 0) {
              onAddComment(ticket.id, newComment, commentImages);
              setNewComment('');
              setCommentImages([]);
            }
          }}
          className="flex gap-2"
        >
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            multiple 
            accept="image/*" 
            onChange={handleFileChange}
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <IconPaperclip />
          </button>
          <input 
            type="text" 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a message..." 
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm shadow-inner"
          />
          <button 
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

const NewTicketModal = ({ onClose, onSubmit, creatorId }: { onClose: () => void, onSubmit: (t: Ticket) => void, creatorId: string }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);
  const [images, setImages] = useState<string[]>([]);
  const [isAiClassifying, setIsAiClassifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAiAutoFill = async () => {
    if (!title || !description) return;
    setIsAiClassifying(true);
    const classification = await classifyTicket(title, description, images);
    if (classification) {
      if (classification.category) setCategory(classification.category);
      if (classification.priority) setPriority(classification.priority as TicketPriority);
    }
    setIsAiClassifying(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTicket: Ticket = {
      id: `T-${Math.floor(Math.random() * 9000) + 1000}`,
      title,
      description,
      status: TicketStatus.OPEN,
      priority,
      category,
      creatorId,
      images,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSubmit(newTicket);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-950 text-white">
          <h2 className="text-xl font-bold">Submit New Ticket</h2>
          <button onClick={onClose} className="p-2 hover:bg-indigo-900 rounded-lg transition-colors text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-4 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Ticket Subject</label>
              <input 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Briefly describe the issue"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Detailed Description</label>
              <textarea 
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Provide steps to reproduce, error codes, etc."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm shadow-sm"
              />
            </div>

            {/* Image Upload Area */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Visual Evidence (Optional)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} className="w-16 h-16 object-cover rounded-lg border border-slate-200" alt="Preview" />
                    <button 
                      type="button"
                      onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-lg"
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all bg-slate-50"
                >
                  <IconPlus className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Add</span>
                </button>
                <input type="file" hidden ref={fileInputRef} multiple accept="image/*" onChange={handleFileChange} />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm bg-white shadow-sm"
                >
                  {['Hardware', 'Software', 'Bug', 'Access', 'Network', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Priority</label>
                <select 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm bg-white shadow-sm"
                >
                  {Object.values(TicketPriority).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
             <button 
              type="button"
              disabled={isAiClassifying || !title || !description}
              onClick={handleAiAutoFill}
              className="w-full mb-3 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-indigo-100 text-indigo-600 text-sm font-bold hover:bg-indigo-50 transition-colors disabled:opacity-50"
            >
              <IconSparkles className="w-4 h-4" />
              {isAiClassifying ? 'Vision AI Analyzing...' : 'Auto-classify (supports images)'}
            </button>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-[2] py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
              >
                Create Ticket
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
