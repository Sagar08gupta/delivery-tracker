import { Ticket, User } from './types';

import usersData from './users.json';

// Seeded Users (with pre-defined roles and teams)
// Admin is NOT registerable, so we seed Ayush Gupta (and others) as Admin
export const SEEDED_USERS: User[] = usersData as User[];

export const DEFAULT_REGIONS = ['APAC', 'EMEA', 'AMER', 'India'];

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

export const SEEDED_TICKETS: Ticket[] = [
  {
    id: 't-1',
    ticketId: 'PSY-1001',
    clientName: 'Google Inc.',
    deliverableType: 'Leadership Cognitive Potential Assessment',
    comments: 'Client requested special emphasis on executive communication skills indicators.',
    assignedTo: 'Sarah Jenkins',
    reviewerName: 'Amit Patel',
    dueDate: today,
    status: 'In Progress',
    region: 'AMER',
    team: 'Personality',
    createdAt: yesterday
  },
  {
    id: 't-2',
    ticketId: 'PSY-1002',
    clientName: 'Reliance Industries',
    deliverableType: 'High-Potential (HiPo) Personality Battery',
    comments: 'All assessments completed. Currently drafting the group insights report.',
    assignedTo: 'Amit Patel',
    reviewerName: 'Sarah Jenkins',
    dueDate: tomorrow,
    status: 'Review Pending',
    region: 'India',
    team: 'Personality',
    createdAt: yesterday
  },
  {
    id: 't-3',
    ticketId: 'PSY-1003',
    clientName: 'HSBC APAC',
    deliverableType: 'Graduate Trainee Personality Profiler',
    comments: 'Completed and sent to the local HR lead. Feedback was positive.',
    assignedTo: 'Sarah Jenkins',
    reviewerName: 'Amit Patel',
    dueDate: yesterday,
    status: 'Delivered',
    region: 'APAC',
    team: 'Personality',
    createdAt: yesterday
  },
  {
    id: 't-4',
    ticketId: 'PSY-1004',
    clientName: 'Bayer AG',
    deliverableType: 'Sales Competency Profile Analysis',
    comments: 'Overdue task - need to expedite the delivery by tonight.',
    assignedTo: 'Amit Patel',
    reviewerName: 'Sarah Jenkins',
    dueDate: yesterday,
    status: 'In Progress',
    region: 'EMEA',
    team: 'Personality',
    createdAt: yesterday
  },
  {
    id: 't-5',
    ticketId: 'COG-1001',
    clientName: 'Microsoft Corporation',
    deliverableType: 'Numerical & Abstract Reasoning Diagnostic',
    comments: 'Evaluating candidate scoring models.',
    assignedTo: 'James Carter',
    reviewerName: 'Neha Sharma',
    dueDate: today,
    status: 'Review Approved',
    region: 'AMER',
    team: 'Cognitive',
    createdAt: yesterday
  },
  {
    id: 't-6',
    ticketId: 'COG-1002',
    clientName: 'Tata Consultancy Services',
    deliverableType: 'Logical Reasoning & Coding Aptitude Test',
    comments: 'Completed the baseline setup for 1,200 candidates.',
    assignedTo: 'Neha Sharma',
    reviewerName: 'James Carter',
    dueDate: yesterday,
    status: 'Delivered',
    region: 'India',
    team: 'Cognitive',
    createdAt: yesterday
  },
  {
    id: 't-7',
    ticketId: 'COG-1003',
    clientName: 'Standard Chartered',
    deliverableType: 'Quantitative Aptitude Screening',
    comments: 'Waiting on client candidate list upload.',
    assignedTo: 'James Carter',
    reviewerName: 'Neha Sharma',
    dueDate: nextWeek,
    status: 'In Progress',
    region: 'APAC',
    team: 'Cognitive',
    createdAt: yesterday
  }
];
