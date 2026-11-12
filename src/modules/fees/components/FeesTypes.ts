// ============================================================================
// Types
// ============================================================================

export type FeeFrequency = "ONE_TIME" | "ANNUAL" | "TERM" | "MONTHLY" | "CUSTOM";
export type InvoiceStatus =
  "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED" | "REFUNDED";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CHEQUE" | "DEMAND_DRAFT" | "OTHER";
export type AdjustmentType = "CONCESSION" | "SCHOLARSHIP" | "WAIVER" | "CORRECTION" | "DISCOUNT";
export type RefundMethod = "CASH" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";

export interface FeeHeadItem {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  _count?: { structureItems: number; invoiceItems: number };
}

export interface FeeStructureItem {
  id: string;
  feeHeadId: string;
  amount: string | number;
  isOptional: boolean;
  feeHead: { id: string; name: string; code: string | null };
}

export interface FeeStructure {
  id: string;
  name: string;
  description: string | null;
  frequency: FeeFrequency;
  dueDate: string | null;
  isActive: boolean;
  academicYear: { id: string; name: string; isCurrent: boolean };
  class: { id: string; name: string } | null;
  items: FeeStructureItem[];
  totalAmount: string | number;
  _count?: { invoices: number };
}

export interface InvoiceItem {
  id: string;
  feeHeadId: string | null;
  headName: string;
  amount: string | number;
  concessionAmount: string | number;
  netAmount: string | number;
}

export interface PaymentItem {
  id: string;
  receiptNumber: string;
  amount: string | number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  transactionReference: string | null;
  remarks: string | null;
  isReversed: boolean;
  reversalReason: string | null;
  recordedBy: { id: string; name: string; role: string };
  reversedBy?: { id: string; name: string } | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    title: string;
    netAmount: string | number;
    paidAmount: string | number;
    student?: {
      name: string;
      admissionNumber: string;
    };
    enrollment?: {
      section?: {
        name: string;
        class?: {
          name: string;
        };
      };
    };
  };
}

export interface AdjustmentItem {
  id: string;
  type: AdjustmentType;
  amount: string | number;
  reason: string;
  approvedBy: { id: string; name: string };
  createdAt: string;
}

export interface RefundItem {
  id: string;
  refundNumber: string;
  amount: string | number;
  reason: string;
  reference: string | null;
  refundMethod: RefundMethod;
  approvedBy: { id: string; name: string };
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  title: string;
  billingPeriod: string | null;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  grossAmount: string | number;
  concessionAmount: string | number;
  netAmount: string | number;
  paidAmount: string | number;
  refundedAmount: string | number;
  outstandingAmount?: string | number;
  student: { id: string; name: string; admissionNumber: string };
  academicYear: { id: string; name: string };
  enrollment?: {
    section?: { name: string; class?: { name: string } };
  } | null;
  items?: InvoiceItem[];
  payments?: PaymentItem[];
  adjustments?: AdjustmentItem[];
  refunds?: RefundItem[];
}

export interface FinancialOverviewData {
  invoicedGross: string | number;
  concessions: string | number;
  invoicedNet: string | number;
  amountCollected: string | number;
  totalRefunds: string | number;
  netCollections: string | number;
  outstandingAmount: string | number;
  totalInvoices: number;
  counts: {
    paid: number;
    partiallyPaid: number;
    overdue: number;
    issued: number;
  };
  paymentMethods: Record<string, string>;
}

export interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  amountReceived: string | number;
  paymentMethod: PaymentMethod;
  transactionReference?: string | null;
  remarks?: string | null;
  invoiceNumber?: string;
  invoiceTitle?: string;
  schoolName?: string;
  studentName?: string;
  admissionNumber?: string;
  className?: string;
  sectionName?: string;
  invoicedAmount?: string | number;
  totalPaid?: string | number;
  remainingBalance?: string | number;
  recordedByName?: string;
}

export interface ClassWiseSummary {
  classId: string;
  className: string;
  studentCount: number;
  invoicedGross: string | number;
  concessions: string | number;
  invoicedNet: string | number;
  collected: string | number;
  outstanding: string | number;
  collectionPercentage: string;
}

export interface StudentAccountData {
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    dob?: string | Date;
    gender?: string;
    currentEnrollment?: {
      id?: string;
      section?: {
        name: string;
        class?: {
          name: string;
        };
      };
    } | null;
  };
  summary: {
    totalGross: string | number;
    totalConcessions: string | number;
    totalNet: string | number;
    totalPaid: string | number;
    totalRefunded: string | number;
    outstandingAmount: string | number;
  };
  invoices: Invoice[];
  payments?: PaymentItem[];
}

export type TabType =
  "overview" | "invoices" | "structures" | "heads" | "reports" | "student-account";

export interface FeesClientProps {
  schoolSlug: string;
  schoolName: string;
  schoolCode: string;
  userRole: string;
  userName: string;
  userId?: string;
  activeAcademicYear: { id: string; name: string } | null;
  allAcademicYears: Array<{ id: string; name: string; isCurrent: boolean }>;
  classes: Array<{ id: string; name: string; sections: Array<{ id: string; name: string }> }>;
}
