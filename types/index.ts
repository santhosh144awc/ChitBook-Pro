import { Timestamp } from "firebase/firestore";

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Group {
  id: string;
  groupName: string;
  startDate: Timestamp;
  memberCount: number; // target number
  chitValue: number;
  agentCommissionPercent: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GroupMember {
  id: string;
  groupId: string;
  groupName: string;
  clientId: string;
  clientName: string;
  chitCount: number;
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Auction {
  id: string;
  groupId: string;
  groupName: string;
  chitMonth: string; // "YYYY-MM" format
  auctionDate: Timestamp;
  paymentDueDate: Timestamp;
  winnerClientId: string | string[]; // Support single or multiple winners
  winnerName: string | string[]; // Support single or multiple winners
  bidAmount: number; // Discount
  payoutAmount: number; // Payable to member
  agentCommission: number;
  totalCollectionAmount: number;
  perMemberContribution: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Payment {
  id: string;
  auctionId: string;
  clientId: string;
  clientName: string;
  groupId: string;
  groupName: string;
  chitMonth: string;
  amountExpected: number;
  amountPaid: number;
  pendingAmount: number;
  paymentDueDate: Timestamp;
  status: "Pending" | "Partial" | "Paid";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaymentLog {
  id: string;
  paymentId: string;
  clientId: string;
  clientName: string;
  groupName: string;
  chitMonth: string; // "YYYY-MM" format
  amountPaid: number;
  paymentDate: Timestamp;
  paymentMethod: "Online" | "Cash";
  createdAt: Timestamp;
}
