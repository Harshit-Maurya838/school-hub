import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { Prisma } from "../src/generated/prisma/client.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth.js";
import { hashPassword } from "../src/lib/password.js";
import { Role, PaymentMethod } from "../src/generated/prisma/enums.js";
import {
  createFeeHead,
  getFeeHeads,
  createFeeStructure,
  getFeeStructures,
  updateFeeStructure,
  generateInvoicesFromStructure,
  getInvoices,
  getInvoiceById,
  cancelInvoice,
  collectPayment,
  reversePayment,
  applyFeeAdjustment,
  processRefund,
  getFinancialOverview,
  getCollectionReport,
  getClassWiseCollectionSummary,
  getStudentFeeAccount,
} from "../src/lib/fees.js";
import { BadRequestError, ConflictError, ForbiddenError } from "../src/lib/errors.js";
import { AuthenticatedUser } from "../src/lib/auth.js";

import { GET as getOverviewHandler } from "../src/app/api/v1/school/[schoolSlug]/fees/overview/route.js";
import { POST as createHeadHandler } from "../src/app/api/v1/school/[schoolSlug]/fees/heads/route.js";
import { GET as getInvoicesHandler } from "../src/app/api/v1/school/[schoolSlug]/fees/invoices/route.js";
import { POST as collectPaymentHandler } from "../src/app/api/v1/school/[schoolSlug]/fees/invoices/[invoiceId]/payments/route.js";

function createAuthRequest(
  url: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {}
) {
  const headers = new Headers();
  if (options.token) {
    headers.set("Cookie", `${SESSION_COOKIE_NAME}=${options.token}`);
  }
  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  return new NextRequest(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe("Phase 12: Production-Ready Fees and Finance Management Test Matrix", () => {
  const SCH_CODE = "FEE_TEST_SCH_01";
  const SCH_SLUG = "fee-test-sch-01";
  const FOREIGN_SCH_CODE = "FEE_TEST_SCH_02";
  const FOREIGN_SCH_SLUG = "fee-test-sch-02";

  let school: { id: string; name: string; slug: string };
  let foreignSchool: { id: string; name: string; slug: string };
  let academicYear: { id: string; name: string };

  let class10: { id: string; name: string };
  let section10A: { id: string; name: string };

  let adminUser: AuthenticatedUser;
  let accountantUser: AuthenticatedUser;
  let teacherUser: AuthenticatedUser;
  let superAdminUser: AuthenticatedUser;
  let foreignAdminUser: AuthenticatedUser;

  let student1: { id: string; name: string };
  let student2: { id: string; name: string };

  let tokenAdmin: string;
  let tokenAccountant: string;
  let tokenTeacher: string;
  let tokenSuperAdmin: string;

  async function cleanup() {
    const schoolCodes = [SCH_CODE, FOREIGN_SCH_CODE];

    await prisma.refund.deleteMany({
      where: { school: { code: { in: schoolCodes } } },
    });
    await prisma.feeAdjustment.deleteMany({
      where: { school: { code: { in: schoolCodes } } },
    });
    await prisma.payment.deleteMany({
      where: { school: { code: { in: schoolCodes } } },
    });
    await prisma.invoiceItem.deleteMany({
      where: { invoice: { school: { code: { in: schoolCodes } } } },
    });
    await prisma.invoice.deleteMany({
      where: { school: { code: { in: schoolCodes } } },
    });
    await prisma.feeStructureItem.deleteMany({
      where: { feeStructure: { school: { code: { in: schoolCodes } } } },
    });
    await prisma.feeStructure.deleteMany({
      where: { school: { code: { in: schoolCodes } } },
    });
    await prisma.feeHead.deleteMany({
      where: { school: { code: { in: schoolCodes } } },
    });
    await prisma.enrollment.deleteMany({
      where: { school: { code: { in: schoolCodes } } },
    });
    await prisma.student.deleteMany({
      where: { school: { code: { in: schoolCodes } } },
    });
    await prisma.section.deleteMany({
      where: { school: { code: { in: schoolCodes } } },
    });
    await prisma.class.deleteMany({
      where: { school: { code: { in: schoolCodes } } },
    });
    await prisma.academicYear.deleteMany({
      where: { school: { code: { in: schoolCodes } } },
    });
    await prisma.auditLog.deleteMany({
      where: { school: { code: { in: schoolCodes } } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "fee_admin@sch1.local",
            "fee_accountant@sch1.local",
            "fee_teacher@sch1.local",
            "fee_admin@sch2.local",
            "fee_super@platform.local",
          ],
        },
      },
    });
    await prisma.school.deleteMany({
      where: { code: { in: schoolCodes } },
    });
  }

  before(async () => {
    await cleanup();

    // 1. Create Schools
    school = await prisma.school.create({
      data: {
        name: "Fee Test Academy",
        code: SCH_CODE,
        slug: SCH_SLUG,
        isActive: true,
      },
      select: { id: true, name: true, slug: true },
    });

    foreignSchool = await prisma.school.create({
      data: {
        name: "Foreign Fee School",
        code: FOREIGN_SCH_CODE,
        slug: FOREIGN_SCH_SLUG,
        isActive: true,
      },
      select: { id: true, name: true, slug: true },
    });

    // 2. Create Users
    const pw = await hashPassword("SecurePass123!");

    const admin = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Finance Admin",
        email: "fee_admin@sch1.local",
        passwordHash: pw,
        role: Role.SCHOOL_ADMIN,
        isActive: true,
      },
    });
    adminUser = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: null,
      role: Role.SCHOOL_ADMIN,
      schoolId: school.id,
      isActive: true,
    };

    const accountant = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Bursar Bob",
        email: "fee_accountant@sch1.local",
        passwordHash: pw,
        role: Role.ACCOUNTANT,
        isActive: true,
      },
    });
    accountantUser = {
      id: accountant.id,
      name: accountant.name,
      email: accountant.email,
      phone: null,
      role: Role.ACCOUNTANT,
      schoolId: school.id,
      isActive: true,
    };

    const teacher = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Teacher Tom",
        email: "fee_teacher@sch1.local",
        passwordHash: pw,
        role: Role.TEACHER,
        isActive: true,
      },
    });
    teacherUser = {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phone: null,
      role: Role.TEACHER,
      schoolId: school.id,
      isActive: true,
    };

    const superAdmin = await prisma.user.create({
      data: {
        schoolId: null,
        name: "Platform Super Admin",
        email: "fee_super@platform.local",
        passwordHash: pw,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    superAdminUser = {
      id: superAdmin.id,
      name: superAdmin.name,
      email: superAdmin.email,
      phone: null,
      role: Role.SUPER_ADMIN,
      schoolId: null,
      isActive: true,
    };

    const foreignAdmin = await prisma.user.create({
      data: {
        schoolId: foreignSchool.id,
        name: "Foreign Admin",
        email: "fee_admin@sch2.local",
        passwordHash: pw,
        role: Role.SCHOOL_ADMIN,
        isActive: true,
      },
    });
    foreignAdminUser = {
      id: foreignAdmin.id,
      name: foreignAdmin.name,
      email: foreignAdmin.email,
      phone: null,
      role: Role.SCHOOL_ADMIN,
      schoolId: foreignSchool.id,
      isActive: true,
    };

    // 3. Tokens
    tokenAdmin = await createSessionToken({
      userId: admin.id,
      schoolId: school.id,
      role: Role.SCHOOL_ADMIN,
      email: admin.email!,
    });
    tokenAccountant = await createSessionToken({
      userId: accountant.id,
      schoolId: school.id,
      role: Role.ACCOUNTANT,
      email: accountant.email!,
    });
    tokenTeacher = await createSessionToken({
      userId: teacher.id,
      schoolId: school.id,
      role: Role.TEACHER,
      email: teacher.email!,
    });
    tokenSuperAdmin = await createSessionToken({
      userId: superAdmin.id,
      schoolId: null,
      role: Role.SUPER_ADMIN,
      email: superAdmin.email!,
    });

    // 4. Academic Year, Class, Section
    academicYear = await prisma.academicYear.create({
      data: {
        schoolId: school.id,
        name: "2026-2027",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: true,
      },
      select: { id: true, name: true },
    });

    class10 = await prisma.class.create({
      data: {
        schoolId: school.id,
        name: "Class 10",
        numericOrder: 10,
      },
      select: { id: true, name: true },
    });

    section10A = await prisma.section.create({
      data: {
        schoolId: school.id,
        classId: class10.id,
        name: "A",
        capacity: 40,
      },
      select: { id: true, name: true },
    });

    // 5. Students & Enrollments
    const s1 = await prisma.student.create({
      data: {
        schoolId: school.id,
        name: "Alice Walker",
        admissionNumber: "ADM-FEE-001",
        dob: new Date("2010-05-15"),
        gender: "FEMALE",
      },
    });
    student1 = { id: s1.id, name: s1.name };

    const s2 = await prisma.student.create({
      data: {
        schoolId: school.id,
        name: "Bob Builder",
        admissionNumber: "ADM-FEE-002",
        dob: new Date("2010-08-20"),
        gender: "MALE",
      },
    });
    student2 = { id: s2.id, name: s2.name };

    await prisma.enrollment.createMany({
      data: [
        {
          schoolId: school.id,
          studentId: student1.id,
          sectionId: section10A.id,
          academicYearId: academicYear.id,
          rollNumber: "101",
          status: "ACTIVE",
        },
        {
          schoolId: school.id,
          studentId: student2.id,
          sectionId: section10A.id,
          academicYearId: academicYear.id,
          rollNumber: "102",
          status: "ACTIVE",
        },
      ],
    });
  });

  after(async () => {
    await cleanup();
  });

  // ==========================================================================
  // 1. Fee Heads Management
  // ==========================================================================
  describe("1. Fee Heads Management", () => {
    it("should allow SCHOOL_ADMIN to create fee heads", async () => {
      const head = await createFeeHead(school.id, adminUser, {
        name: "Tuition Fee",
        code: "TUIT",
        description: "Standard academic tuition",
      });

      assert.ok(head.id);
      assert.strictEqual(head.name, "Tuition Fee");
      assert.strictEqual(head.code, "TUIT");
    });

    it("should reject duplicate fee head name in the same school", async () => {
      await assert.rejects(
        async () => {
          await createFeeHead(school.id, adminUser, {
            name: "Tuition Fee",
          });
        },
        (err: unknown) => err instanceof ConflictError && err.statusCode === 409
      );
    });

    it("should allow identical fee head name in a different school (tenant isolation)", async () => {
      const foreignHead = await createFeeHead(foreignSchool.id, foreignAdminUser, {
        name: "Tuition Fee",
      });
      assert.ok(foreignHead.id);
      assert.strictEqual(foreignHead.schoolId, foreignSchool.id);
    });

    it("should prevent ACCOUNTANT and TEACHER from configuring fee heads", async () => {
      await assert.rejects(
        async () => {
          await createFeeHead(school.id, accountantUser, {
            name: "Transport Fee",
          });
        },
        (err: unknown) => err instanceof ForbiddenError && err.statusCode === 403
      );

      await assert.rejects(
        async () => {
          await createFeeHead(school.id, teacherUser, {
            name: "Transport Fee",
          });
        },
        (err: unknown) => err instanceof ForbiddenError && err.statusCode === 403
      );
    });

    it("should list fee heads for authorized users", async () => {
      // Create additional heads
      await createFeeHead(school.id, adminUser, {
        name: "Laboratory Fee",
        code: "LAB",
      });
      await createFeeHead(school.id, adminUser, {
        name: "Examination Fee",
        code: "EXAM",
      });

      const heads = await getFeeHeads(school.id, accountantUser);
      assert.strictEqual(heads.length, 3);
    });
  });

  // ==========================================================================
  // 2. Fee Structures Management
  // ==========================================================================
  describe("2. Fee Structures Management", () => {
    let feeHeads: Array<{ id: string; name: string }>;

    before(async () => {
      feeHeads = await getFeeHeads(school.id, adminUser);
    });

    it("should create fee structure with valid items and calculate total amount", async () => {
      const tuitHead = feeHeads.find((h) => h.name === "Tuition Fee")!;
      const labHead = feeHeads.find((h) => h.name === "Laboratory Fee")!;

      const structure = await createFeeStructure(school.id, adminUser, {
        academicYearId: academicYear.id,
        classId: class10.id,
        name: "Class 10 Term 1 Structure",
        frequency: "TERM",
        items: [
          { feeHeadId: tuitHead.id, amount: 5000.0 },
          { feeHeadId: labHead.id, amount: 1500.5 },
        ],
      });

      assert.ok(structure.id);
      assert.strictEqual(structure.items.length, 2);

      const fetched = await getFeeStructures(school.id, adminUser);
      const target = fetched.find((s) => s.id === structure.id)!;
      assert.strictEqual(target.totalAmount.toString(), "6500.5");
    });

    it("should reject negative amounts in fee structure items", async () => {
      const tuitHead = feeHeads.find((h) => h.name === "Tuition Fee")!;

      await assert.rejects(
        async () => {
          await createFeeStructure(school.id, adminUser, {
            academicYearId: academicYear.id,
            name: "Invalid Negative Structure",
            items: [{ feeHeadId: tuitHead.id, amount: -500 }],
          });
        },
        (err: unknown) => err instanceof BadRequestError && err.statusCode === 400
      );
    });

    it("should reject duplicate fee structure name in same class and academic year", async () => {
      const tuitHead = feeHeads.find((h) => h.name === "Tuition Fee")!;

      await assert.rejects(
        async () => {
          await createFeeStructure(school.id, adminUser, {
            academicYearId: academicYear.id,
            classId: class10.id,
            name: "Class 10 Term 1 Structure",
            items: [{ feeHeadId: tuitHead.id, amount: 5000 }],
          });
        },
        (err: unknown) => err instanceof ConflictError && err.statusCode === 409
      );
    });

    it("should prevent cross-tenant fee head assignment", async () => {
      // Try to use school 1 fee head in school 2 fee structure
      const foreignYear = await prisma.academicYear.create({
        data: {
          schoolId: foreignSchool.id,
          name: "2026-2027",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2027-03-31"),
        },
      });

      const s1Head = feeHeads[0];

      await assert.rejects(
        async () => {
          await createFeeStructure(foreignSchool.id, foreignAdminUser, {
            academicYearId: foreignYear.id,
            name: "Foreign Structure",
            items: [{ feeHeadId: s1Head.id, amount: 1000 }],
          });
        },
        (err: unknown) => err instanceof BadRequestError && err.statusCode === 400
      );
    });
  });

  // ==========================================================================
  // 3. Invoices and Student Liabilities
  // ==========================================================================
  describe("3. Invoices and Student Liabilities", () => {
    let structureId: string;
    let generatedInvoiceId: string;

    before(async () => {
      const structures = await getFeeStructures(school.id, adminUser);
      structureId = structures[0].id;
    });

    it("should allow ACCOUNTANT to generate invoices from approved fee structure", async () => {
      const result = await generateInvoicesFromStructure(school.id, accountantUser, {
        feeStructureId: structureId,
        academicYearId: academicYear.id,
        classId: class10.id,
        billingPeriod: "Term 1 2026",
      });

      assert.strictEqual(result.generatedCount, 2);
      assert.strictEqual(result.invoices.length, 2);

      const inv = result.invoices[0];
      assert.ok(inv.invoiceNumber.startsWith("INV-"));
      assert.strictEqual(inv.status, "ISSUED");
      assert.strictEqual(inv.grossAmount.toString(), "6500.5");
      assert.strictEqual(inv.netAmount.toString(), "6500.5");
      assert.strictEqual(inv.paidAmount.toString(), "0");
      assert.strictEqual(inv.items.length, 2);

      generatedInvoiceId = inv.id;
    });

    it("should prevent duplicate invoice generation for same student, fee schedule, and billing period", async () => {
      await assert.rejects(
        async () => {
          await generateInvoicesFromStructure(school.id, adminUser, {
            feeStructureId: structureId,
            academicYearId: academicYear.id,
            studentIds: [student1.id],
            billingPeriod: "Term 1 2026",
          });
        },
        (err: unknown) => err instanceof ConflictError && err.statusCode === 409
      );
    });

    it("should preserve immutable line items when fee structure is edited later", async () => {
      const invBefore = await getInvoiceById(school.id, adminUser, generatedInvoiceId);
      const grossBefore = invBefore.grossAmount.toString();

      // Admin updates fee structure to change tuition to 9999.00
      const heads = await getFeeHeads(school.id, adminUser);
      const tuitHead = heads.find((h) => h.name === "Tuition Fee")!;

      await updateFeeStructure(school.id, adminUser, structureId, {
        items: [{ feeHeadId: tuitHead.id, amount: 9999.0 }],
      });

      // Verify historical invoice remained completely untouched
      const invAfter = await getInvoiceById(school.id, adminUser, generatedInvoiceId);
      assert.strictEqual(invAfter.grossAmount.toString(), grossBefore);
      assert.strictEqual(invAfter.netAmount.toString(), grossBefore);
    });
  });

  // ==========================================================================
  // 4. Payment Collection, Receipts, and Overpayment Prevention
  // ==========================================================================
  describe("4. Payment Collection & Concurrency", () => {
    let invoiceId: string;

    before(async () => {
      const invoices = await getInvoices(school.id, adminUser, { studentId: student1.id });
      invoiceId = invoices.invoices[0].id;
    });

    it("should record partial offline payment and transition status to PARTIALLY_PAID", async () => {
      const result = await collectPayment(school.id, accountantUser, {
        invoiceId,
        amount: 2500.5,
        paymentMethod: PaymentMethod.CASH,
        remarks: "First installment",
      });

      assert.ok(result.payment.id);
      assert.ok(result.payment.receiptNumber.startsWith("REC-"));
      assert.strictEqual(result.payment.amount.toString(), "2500.5");
      assert.strictEqual(result.receipt.amountReceived.toString(), "2500.5");
      assert.strictEqual(result.receipt.remainingBalance.toString(), "4000");

      const inv = await getInvoiceById(school.id, adminUser, invoiceId);
      assert.strictEqual(inv.status, "PARTIALLY_PAID");
      assert.strictEqual(inv.paidAmount.toString(), "2500.5");
      assert.strictEqual(inv.outstandingAmount.toString(), "4000");
    });

    it("should reject payment amount that exceeds outstanding balance (overpayment prevention)", async () => {
      // Remaining is 4000. Try to pay 4001.
      await assert.rejects(
        async () => {
          await collectPayment(school.id, accountantUser, {
            invoiceId,
            amount: 4000.01,
            paymentMethod: PaymentMethod.BANK_TRANSFER,
          });
        },
        (err: unknown) =>
          err instanceof BadRequestError && err.message.includes("exceeds outstanding balance")
      );
    });

    it("should record full payment of remaining balance and transition status to PAID", async () => {
      const result = await collectPayment(school.id, accountantUser, {
        invoiceId,
        amount: 4000.0,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        transactionReference: "NEFT-998877",
      });

      assert.strictEqual(result.receipt.remainingBalance.toString(), "0");

      const inv = await getInvoiceById(school.id, adminUser, invoiceId);
      assert.strictEqual(inv.status, "PAID");
      assert.strictEqual(inv.paidAmount.toString(), "6500.5");
      assert.strictEqual(inv.outstandingAmount.toString(), "0");
    });

    it("should prevent further payment collection on an already PAID invoice", async () => {
      await assert.rejects(
        async () => {
          await collectPayment(school.id, accountantUser, {
            invoiceId,
            amount: 100.0,
            paymentMethod: PaymentMethod.CASH,
          });
        },
        (err: unknown) => err instanceof BadRequestError
      );
    });
  });

  // ==========================================================================
  // 5. Adjustments, Concessions, Cancellations, Reversals, and Refunds
  // ==========================================================================
  describe("5. Adjustments, Cancellations, Reversals, and Refunds", () => {
    let student2InvoiceId: string;
    let paymentToReverseId: string;

    before(async () => {
      const invoices = await getInvoices(school.id, adminUser, { studentId: student2.id });
      student2InvoiceId = invoices.invoices[0].id;
    });

    it("should allow SCHOOL_ADMIN to apply concession and adjust net payable", async () => {
      // Invoice 2 is currently gross 6500.5, concession 0, net 6500.5
      const adj = await applyFeeAdjustment(school.id, adminUser, student2InvoiceId, {
        type: "SCHOLARSHIP",
        amount: 1500.5,
        reason: "Merit scholarship 2026",
      });

      assert.ok(adj.id);
      assert.strictEqual(adj.amount.toString(), "1500.5");

      const inv = await getInvoiceById(school.id, adminUser, student2InvoiceId);
      assert.strictEqual(inv.concessionAmount.toString(), "1500.5");
      assert.strictEqual(inv.netAmount.toString(), "5000");
    });

    it("should prevent ACCOUNTANT from approving concessions", async () => {
      await assert.rejects(
        async () => {
          await applyFeeAdjustment(school.id, accountantUser, student2InvoiceId, {
            amount: 500,
            reason: "Unauthorized discount",
          });
        },
        (err: unknown) => err instanceof ForbiddenError && err.statusCode === 403
      );
    });

    it("should reject concession exceeding gross invoice amount", async () => {
      await assert.rejects(
        async () => {
          await applyFeeAdjustment(school.id, adminUser, student2InvoiceId, {
            amount: 99999,
            reason: "Too large",
          });
        },
        (err: unknown) => err instanceof BadRequestError
      );
    });

    it("should collect payment and then reverse it through audited reversal", async () => {
      // Pay 2000
      const paymentRes = await collectPayment(school.id, accountantUser, {
        invoiceId: student2InvoiceId,
        amount: 2000,
        paymentMethod: PaymentMethod.CHEQUE,
        transactionReference: "CHQ-123456",
      });
      paymentToReverseId = paymentRes.payment.id;

      const invPaid = await getInvoiceById(school.id, adminUser, student2InvoiceId);
      assert.strictEqual(invPaid.paidAmount.toString(), "2000");

      // Accountant tries to reverse -> Forbidden!
      await assert.rejects(
        async () => {
          await reversePayment(school.id, accountantUser, paymentToReverseId, {
            reason: "Accountant cannot reverse",
          });
        },
        (err: unknown) => err instanceof ForbiddenError && err.statusCode === 403
      );

      // Admin reverses payment with mandatory reason
      const reversed = await reversePayment(school.id, adminUser, paymentToReverseId, {
        reason: "Cheque bounced by bank",
      });

      assert.strictEqual(reversed.isReversed, true);
      assert.strictEqual(reversed.status, "REVERSED");
      assert.strictEqual(reversed.reversalReason, "Cheque bounced by bank");

      const invAfter = await getInvoiceById(school.id, adminUser, student2InvoiceId);
      assert.strictEqual(invAfter.paidAmount.toString(), "0");
      assert.strictEqual(invAfter.outstandingAmount.toString(), "5000");
    });

    it("should process authorized refund on paid amount", async () => {
      // Pay 3000
      await collectPayment(school.id, accountantUser, {
        invoiceId: student2InvoiceId,
        amount: 3000,
        paymentMethod: PaymentMethod.CASH,
      });

      // Admin processes partial refund of 1000
      const refund = await processRefund(school.id, adminUser, student2InvoiceId, {
        amount: 1000,
        reason: "Excess transport fee returned",
        reference: "CASH-REF-01",
      });

      assert.ok(refund.refundNumber.startsWith("REF-"));
      assert.strictEqual(refund.amount.toString(), "1000");

      const inv = await getInvoiceById(school.id, adminUser, student2InvoiceId);
      assert.strictEqual(inv.refundedAmount.toString(), "1000");
      // Net collected = 3000 - 1000 = 2000. Outstanding on 5000 invoice is 3000.
      assert.strictEqual(inv.outstandingAmount.toString(), "3000");
    });

    it("should prevent invoice cancellation when active collections exist", async () => {
      await assert.rejects(
        async () => {
          await cancelInvoice(school.id, adminUser, student2InvoiceId, {
            reason: "Cancel invoice with money collected",
          });
        },
        (err: unknown) => err instanceof BadRequestError
      );
    });

    it("should safely cancel an unpaid invoice with mandatory reason", async () => {
      // Generate a new ad-hoc invoice for testing cancellation
      const heads = await getFeeHeads(school.id, adminUser);
      const customStructure = await createFeeStructure(school.id, adminUser, {
        academicYearId: academicYear.id,
        name: "One-Time Event Fee",
        frequency: "ONE_TIME",
        items: [{ feeHeadId: heads[0].id, amount: 200 }],
      });

      const invGen = await generateInvoicesFromStructure(school.id, adminUser, {
        feeStructureId: customStructure.id,
        academicYearId: academicYear.id,
        studentIds: [student1.id],
        billingPeriod: "Event 2026",
      });
      const unpaidInvId = invGen.invoices[0].id;

      const cancelled = await cancelInvoice(school.id, adminUser, unpaidInvId, {
        reason: "Event cancelled due to rain",
      });

      assert.strictEqual(cancelled.status, "CANCELLED");
      assert.strictEqual(cancelled.cancellationReason, "Event cancelled due to rain");
      assert.ok(cancelled.cancelledAt);
    });
  });

  // ==========================================================================
  // 6. Financial Intelligence & Reports Precision
  // ==========================================================================
  describe("6. Financial Intelligence & Decimal Calculations", () => {
    it("should compute accurate financial metrics with exact decimal arithmetic", async () => {
      const overview = await getFinancialOverview(school.id, adminUser);

      assert.ok(overview.invoicedGross instanceof Prisma.Decimal);
      assert.ok(overview.invoicedNet instanceof Prisma.Decimal);
      assert.ok(overview.amountCollected instanceof Prisma.Decimal);
      assert.ok(overview.totalRefunds instanceof Prisma.Decimal);
      assert.ok(overview.netCollections instanceof Prisma.Decimal);
      assert.ok(overview.outstandingAmount instanceof Prisma.Decimal);

      // Verify netCollections = amountCollected - totalRefunds
      assert.strictEqual(
        overview.netCollections.toString(),
        overview.amountCollected.minus(overview.totalRefunds).toString()
      );
    });

    it("should generate collection report and class-wise collection summary", async () => {
      const report = await getCollectionReport(school.id, accountantUser);
      assert.ok(Array.isArray(report));
      assert.ok(report.length >= 2);

      const classSummary = await getClassWiseCollectionSummary(
        school.id,
        adminUser,
        academicYear.id
      );
      assert.strictEqual(classSummary.length, 1);
      assert.strictEqual(classSummary[0].className, "Class 10");
      assert.ok(Number(classSummary[0].collectionPercentage) > 0);
    });

    it("should return student fee ledger with all invoices and transactions", async () => {
      const account = await getStudentFeeAccount(school.id, accountantUser, student1.id);
      assert.strictEqual(account.student.name, "Alice Walker");
      assert.ok(account.invoices.length > 0);
      assert.ok(account.summary.totalPaid.isPositive());
    });
  });

  // ==========================================================================
  // 7. Security, Tenant Isolation & RBAC Boundaries
  // ==========================================================================
  describe("7. Security, Tenant Isolation & RBAC Boundaries", () => {
    it("should prevent TEACHER role from accessing finance endpoints", async () => {
      await assert.rejects(
        async () => {
          await getFinancialOverview(school.id, teacherUser);
        },
        (err: unknown) => err instanceof ForbiddenError && err.statusCode === 403
      );
    });

    it("should prevent SUPER_ADMIN from routine tenant finance operations", async () => {
      await assert.rejects(
        async () => {
          await getFinancialOverview(school.id, superAdminUser);
        },
        (err: unknown) => err instanceof ForbiddenError && err.statusCode === 403
      );
    });

    it("should prevent cross-school finance access (Admin of School B cannot access School A)", async () => {
      await assert.rejects(
        async () => {
          await getFeeHeads(school.id, foreignAdminUser);
        },
        (err: unknown) => err instanceof ForbiddenError && err.statusCode === 403
      );
    });
  });

  // ==========================================================================
  // 8. API Endpoints Integration
  // ==========================================================================
  describe("8. API Endpoints Integration", () => {
    it("GET /overview: returns 200 with financial summary", async () => {
      const req = createAuthRequest(`http://localhost/api/v1/school/${SCH_SLUG}/fees/overview`, {
        token: tokenAdmin,
      });
      const res = await getOverviewHandler(req, {
        params: Promise.resolve({ schoolSlug: SCH_SLUG }),
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.ok(body.data.netCollections !== undefined);
    });

    it("POST /heads: creates head via API", async () => {
      const req = createAuthRequest(`http://localhost/api/v1/school/${SCH_SLUG}/fees/heads`, {
        method: "POST",
        token: tokenAdmin,
        body: { name: "Sports Fee", code: "SPORTS" },
      });
      const res = await createHeadHandler(req, {
        params: Promise.resolve({ schoolSlug: SCH_SLUG }),
      });
      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.data.name, "Sports Fee");
    });

    it("GET /invoices: lists invoices for accountant", async () => {
      const req = createAuthRequest(`http://localhost/api/v1/school/${SCH_SLUG}/fees/invoices`, {
        token: tokenAccountant,
      });
      const res = await getInvoicesHandler(req, {
        params: Promise.resolve({ schoolSlug: SCH_SLUG }),
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.ok(Array.isArray(body.data));
    });

    it("POST /payments: rejects invalid payment via API", async () => {
      const req = createAuthRequest(
        `http://localhost/api/v1/school/${SCH_SLUG}/fees/invoices/non_existent/payments`,
        {
          method: "POST",
          token: tokenAccountant,
          body: { amount: -50, paymentMethod: "CASH" },
        }
      );
      const res = await collectPaymentHandler(req, {
        params: Promise.resolve({ schoolSlug: SCH_SLUG, invoiceId: "non_existent" }),
      });
      assert.strictEqual(res.status, 400);
    });

    it("GET /overview: rejects TEACHER with 403 Forbidden", async () => {
      const req = createAuthRequest(`http://localhost/api/v1/school/${SCH_SLUG}/fees/overview`, {
        token: tokenTeacher,
      });
      const res = await getOverviewHandler(req, {
        params: Promise.resolve({ schoolSlug: SCH_SLUG }),
      });
      assert.strictEqual(res.status, 403);
    });

    it("GET /overview: rejects SUPER_ADMIN without school scope with 403 Forbidden", async () => {
      const req = createAuthRequest(`http://localhost/api/v1/school/${SCH_SLUG}/fees/overview`, {
        token: tokenSuperAdmin,
      });
      const res = await getOverviewHandler(req, {
        params: Promise.resolve({ schoolSlug: SCH_SLUG }),
      });
      assert.strictEqual(res.status, 403);
    });
  });
});
