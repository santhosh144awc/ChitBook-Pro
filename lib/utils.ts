import { format, parseISO, startOfMonth, endOfMonth, isPast } from "date-fns";
import { Timestamp } from "firebase/firestore";

export const formatDate = (timestamp: Timestamp | Date | string): string => {
  let date: Date;
  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (typeof timestamp === "string") {
    date = parseISO(timestamp);
  } else {
    date = timestamp;
  }
  return format(date, "dd MMM yyyy");
};

export const formatDateTime = (timestamp: Timestamp | Date | string): string => {
  let date: Date;
  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (typeof timestamp === "string") {
    date = parseISO(timestamp);
  } else {
    date = timestamp;
  }
  return format(date, "dd MMM yyyy HH:mm");
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const isOverdue = (dueDate: Timestamp | Date): boolean => {
  let date: Date;
  if (dueDate instanceof Timestamp) {
    date = dueDate.toDate();
  } else {
    date = dueDate;
  }
  return isPast(date);
};

export const getMonthStart = (date: Date = new Date()): Date => {
  return startOfMonth(date);
};

export const getMonthEnd = (date: Date = new Date()): Date => {
  return endOfMonth(date);
};

export const formatMonth = (date: Date | string): string => {
  let d: Date;
  if (typeof date === "string") {
    d = parseISO(date);
  } else {
    d = date;
  }
  return format(d, "MMMM yyyy");
};

export const getCurrentMonth = (): string => {
  return format(new Date(), "yyyy-MM");
};

// Calculate auction amounts
export const calculateAuctionAmounts = (
  chitValue: number,
  bidAmount: number,
  agentCommissionPercent: number,
  memberCount: number
) => {
  const payoutAmount = chitValue - bidAmount;
  const agentCommission = (chitValue * agentCommissionPercent) / 100;
  const totalCollectionAmount = payoutAmount + agentCommission;
  const perMemberContribution = totalCollectionAmount / memberCount;

  return {
    payoutAmount,
    agentCommission,
    totalCollectionAmount,
    perMemberContribution,
  };
};

// Generic sort function for arrays
export const sortArray = <T>(
  array: T[],
  sortField: keyof T,
  sortDirection: "asc" | "desc",
  getValue?: (item: T, field: keyof T) => any
): T[] => {
  const sorted = [...array];
  sorted.sort((a, b) => {
    let aValue = getValue ? getValue(a, sortField) : a[sortField];
    let bValue = getValue ? getValue(b, sortField) : b[sortField];

    // Handle null/undefined values
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Handle string comparison
    if (typeof aValue === "string" && typeof bValue === "string") {
      const lowerA = aValue.toLowerCase();
      const lowerB = bValue.toLowerCase();
      return sortDirection === "asc"
        ? lowerA.localeCompare(lowerB)
        : lowerB.localeCompare(lowerA);
    }

    // Handle number/date comparison
    const numA = typeof aValue === "number" ? aValue : (aValue as any)?.getTime?.() ?? aValue;
    const numB = typeof bValue === "number" ? bValue : (bValue as any)?.getTime?.() ?? bValue;
    
    return sortDirection === "asc" ? numA - numB : numB - numA;
  });
  
  return sorted;
};