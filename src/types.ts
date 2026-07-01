export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'Admin' | 'Team Member';
  team: 'Personality' | 'Cognitive' | 'Both'; // Admin can manage both, but has a default or is exempt
  loginTeam?: 'Personality' | 'Cognitive';
  password?: string;
}

export interface Ticket {
  id: string;
  ticketId: string; // PSY-1001, COG-1001, etc.
  clientName: string;
  deliverableType: string;
  comments: string;
  assignedTo: string; // Must be a member of the same team
  reviewerName: string; // Must be a member of the same team
  dueDate: string; // YYYY-MM-DD
  status: 'In Progress' | 'Review Pending' | 'Review Approved' | 'Delivered';
  region: string; // APAC, EMEA, AMER, India
  team: 'Personality' | 'Cognitive'; // Hidden system field
  createdAt: string;
  deliveryDate?: string; // Optional actual delivery date
  contentTeamInvolved?: boolean; // Phase 5 extension
  contentTeamNames?: string[]; // Phase 5 extension
}

export interface RegionOption {
  id: string;
  name: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  fullName: string;
  empId: string;
  role: 'Admin' | 'Team Member';
  action: 'Create' | 'Update' | 'Delete' | 'Status Toggle' | 'Import' | 'Clear All';
  ticketName: string;
  details: string;
  reason?: string;
}

export interface AppNotification {
  id: string;
  ticketId: string;
  oldDate: string;
  newDate: string;
  reason: string;
  userId: string;
  userName: string;
  timestamp: string;
  isRead: boolean;
}
