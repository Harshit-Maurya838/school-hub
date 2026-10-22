<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CampusPulse: Coding Agent & Architecture Guidelines

This document provides mandatory, actionable rules for all AI coding assistants, automated tools, and engineers working on the CampusPulse School Management codebase.

---

## 1. Repository Architecture & Module Ownership

CampusPulse is structured as a **modular monolith** with explicit domain boundaries:

```
src/
├── app/               # Next.js App Router (Pages, Layouts, thin API Route Handlers)
├── components/        # Truly shared UI components (common/, layout/, dashboard/)
├── lib/               # Cross-cutting infrastructure (database, logging, errors, auth helpers)
└── modules/           # Domain business logic, domain services, and domain components
    ├── onboarding/    # Registration, school provisioning, invitations, readiness checklist
    ├── auth/          # JWT sessions, bcrypt hashing, RBAC permissions matrix, role UI
    ├── academics/     # Sessions/years, classes, sections, curriculum subjects
    ├── students/      # Student profiles, guardian relationships, admissions, enrollments
    ├── staff/         # Faculty profiles, class teachers, subject teacher allocations
    ├── attendance/    # Daily attendance registers, drafts, locks, corrections, analytics
    ├── examinations/  # Exam scheduling, subject configs, marks entry, review, publication
    └── fees/          # Fee heads, structures, invoices, collections, adjustments, refunds
```

### Module Boundaries

- Domain logic must reside within `src/modules/<domain>/services/`.
- Domain UI client components must reside within `src/modules/<domain>/components/`.
- Every domain module provides a public interface via its root `src/modules/<domain>/index.ts`.
- Cross-domain interactions should go through public domain module exports, not deep internal files.

---

## 2. Rules for Choosing Where New Code Belongs

Follow this decision tree when adding or modifying code:

1. **Next.js Pages & Route Handlers (`src/app/`)**:
   - Only for URL routing, layout composition, server-side data fetching, and HTTP request parsing.
   - Keep route handlers thin (< 50 lines). Delegate all business logic and mutations to domain services.
2. **Domain Business Logic (`src/modules/<domain>/services/`)**:
   - If the code calculates averages, enforces workflow status transitions, manages financial balances, or verifies preconditions, it belongs in a module service.
3. **Module UI Components (`src/modules/<domain>/components/`)**:
   - If a React component is specific to one domain (e.g. `AttendanceRegisterModal`, `ExamClient`, `FeesClient`), place it in that module's `components/` directory.
4. **Shared UI Components (`src/components/`)**:
   - Only truly shared primitives (`Badge`, `Modal`, `StatCard`) or cross-cutting layouts (`Sidebar`, `Header`) belong in `src/components/`.
5. **Shared Infrastructure (`src/lib/`)**:
   - Only cross-cutting utilities (Prisma clients, Pino logger, error classes, environment validator, email dispatcher) belong in `src/lib/`. Never place domain business logic directly in `src/lib/`.
6. **Reusable Operations Scripts (`scripts/`)**:
   - Data seeding, administrative bootstrapping, and operational tasks belong in `scripts/`.

---

## 3. Dependency Direction & Import Conventions

Enforce a strict one-way dependency flow:

```
[ App Router Pages & API Routes ]
               │
               ▼
   [ Domain Module Services & UI ]
               │
               ▼
    [ Shared Infrastructure (src/lib/) ]
               │
               ▼
[ Database (Prisma) & Backing Services (Redis) ]
```

### Import Rules

- **No Circular Imports**: Module A must never import from Module B if Module B imports from Module A.
- **Infrastructure Isolation**: `src/lib/` files must never import from `src/modules/` or `src/app/`.
- **Prefer `@/` Aliases**: Always use `@/modules/<domain>`, `@/components/...`, and `@/lib/...` for application code.
- **Node.js Native Test Imports**: Test files in `tests/` executed with `node --import tsx` must import relative paths without breaking ESM resolution (e.g., `import { prisma } from "../src/lib/prisma.js"` or `import { ... } from "../src/modules/..."`).

---

## 4. API Handler & Service-Layer Conventions

Every API route handler must follow the standardized wrapper pattern:

```ts
import { NextRequest } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireAuth, assertSchoolAccess } from "@/modules/auth";
import { yourDomainServiceFunction } from "@/modules/<domain>";

export const POST = apiHandler(async (req: NextRequest, { params }) => {
  const { schoolSlug } = await params;
  const user = await requireAuth(req);
  const school = await assertSchoolAccess(user, schoolSlug);

  const body = await req.json();
  const result = await yourDomainServiceFunction({
    schoolId: school.id,
    actorUserId: user.id,
    ...body,
  });

  return successResponse(result, 201);
});
```

### Rules:

- Always `await params` in dynamic Next.js 16 route handlers.
- Use `apiHandler(...)` to automatically catch errors and map them to HTTP responses.
- Return structured JSON responses using `successResponse(data, statusCode)`.

---

## 5. Authentication, RBAC & Tenant-Isolation Requirements

Security invariants are strictly non-negotiable:

1. **Multi-Tenant Scoping**:
   - Every database query touching school data must filter by `schoolId`.
   - Never query by `id` alone when modifying tenant data:
     ```ts
     // CORRECT:
     await prisma.student.findFirst({ where: { id: studentId, schoolId } });

     // WRONG:
     await prisma.student.findUnique({ where: { id: studentId } });
     ```
   - Alternatively, use the tenant-scoped client: `const tenantPrisma = createTenantPrisma(schoolId)`.
2. **Explicit Server-Side Authorization**:
   - Never trust client-side claims or hidden UI elements.
   - For school actions, verify school access via `assertSchoolAccess(user, schoolSlug)`.
   - For teacher actions, verify active assignment via `assertAttendanceTeacherAccess(...)` or `assertMarksTeacherAccess(...)`.
   - For accountant actions, verify financial access via `assertCanViewSchoolFees(...)` or `assertCanCollectSchoolFees(...)`.
   - `SUPER_ADMIN` has platform scope (`schoolId = null`) and must not perform tenant-scoped operations without explicit administrative override.

---

## 6. Prisma Schema & Migration Safety Rules

1. **No Destructive Operations**: Never run `npx prisma db push --force-reset` or `prisma migrate reset` in environments with persistent data.
2. **Always Use Versioned Migrations**: Create new migrations using `npx prisma migrate dev --name <description>`.
3. **No Arbitrary Renaming**: Never rename models, columns, or enums solely for stylistic reasons, as doing so requires database downtime and migration rewrites.
4. **Indexes for Multi-Tenant Performance**: Every table with `schoolId` must index `schoolId` and composite unique keys (e.g., `@@unique([schoolId, code])`, `@@index([schoolId])`).
5. **Partial Unique Indexes**: For soft-deleted entities or active status uniqueness, implement partial unique indexes in raw SQL migrations when necessary.

---

## 7. Transaction & Financial-Integrity Requirements

For financial operations (Domain: Fees & Finance):

1. **Decimal Precision**:
   - Never use JavaScript floating-point numbers (`number`) for currency calculations.
   - Always use `Prisma.Decimal` with explicit arithmetic methods: `.add()`, `.sub()`, `.mul()`.
2. **Row Locking (Pessimistic Locking)**:
   - When recording payments, adjusting invoices, or issuing refunds, lock the target invoice row using `SELECT ... FOR UPDATE` inside an interactive transaction:
     ```ts
     await prisma.$transaction(async (tx) => {
       const [invoice] = await tx.$queryRawUnsafe<Invoice[]>(
         `SELECT * FROM "invoices" WHERE "id" = $1 AND "schoolId" = $2 FOR UPDATE`,
         invoiceId,
         schoolId
       );
       // Perform balance recalculation and payment recording
     });
     ```
3. **Immutable Snapshots**:
   - Fee structures must be snapshotted into `InvoiceItem` rows at invoice generation time.
   - Subsequent changes to global fee structures must never retroactively alter existing invoices.
4. **Receipt Generation**:
   - Every payment must generate a sequential, human-readable receipt number (`REC-YYYYMMDD-XXXX`).

---

## 8. Audit Logging & Sensitive Data Handling

1. **Audit Sensitive Actions**:
   - Record an audit event for: user creation, role changes, school status updates, mark alterations, attendance corrections, invoice cancellations, payment reversals, and refunds.
   - Use `logAuditEvent(...)` or `recordAuditEvent(...)`:
     ```ts
     await logAuditEvent({
       schoolId,
       userId: actorUserId,
       action: "PAYMENT_REVERSED",
       entityType: "Payment",
       entityId: payment.id,
       details: { reason, amount: payment.amount.toString() },
     });
     ```
2. **Sanitize Logs**:
   - Never log passwords, password hashes, JWT secrets, raw invitation tokens, or complete guardian financial credentials.

---

## 9. UI & Accessibility Conventions

1. **Server vs. Client Components**:
   - Default to React Server Components (`page.tsx`, `layout.tsx`) for initial data fetching and SSR.
   - Use `"use client"` only for interactive forms, modals, search filters, and tab state management.
2. **Design Language**:
   - Use Tailwind CSS with curated slate/indigo/emerald/rose color scales.
   - Display clear status badges (`Badge`) with consistent semantic colors:
     - Active / Approved / Present: Emerald
     - Pending / Draft / Late: Amber / Yellow
     - Inactive / Rejected / Absent: Rose / Red
3. **Accessibility**:
   - Every form input must have an associated `<label>` or `aria-label`.
   - Modals must support keyboard escape closing and focus management.
   - Interactive buttons must provide visual loading feedback during asynchronous requests.

---

## 10. Validation & Error-Handling Conventions

1. **Input Validation**:
   - Always validate request bodies and query parameters with Zod schemas.
   - Throw `ValidationError(zodError.issues)` or `BadRequestError(message)`.
2. **Standard Error Classes**:
   - Use the domain error hierarchy from `src/lib/errors.ts`:
     - `BadRequestError` (400)
     - `UnauthorizedError` (401)
     - `ForbiddenError` (403)
     - `NotFoundError` (404)
     - `ConflictError` (409)
     - `PreconditionFailedError` (412)
     - `InternalServerError` (500)
3. **No Swallowing Errors**:
   - Never write empty `catch {}` blocks. If an error is caught, log it with structured context using `logger.error(...)`.

---

## 11. Test Requirements for New Features & Regressions

1. **Every New Feature Requires Tests**:
   - Add integration tests covering happy paths, unauthorized attempts, cross-tenant isolation, and invalid payloads.
2. **Preserve Existing Tests**:
   - All 16 existing test suites in `tests/` must continue to pass with 0 failures:
     - `academic-setup.test.ts`
     - `api-auth.test.ts`
     - `attendance.test.ts`
     - `auth.test.ts`
     - `authorization.test.ts`
     - `exams.test.ts`
     - `fees.test.ts`
     - `invitations.test.ts`
     - `parent-student-onboarding.test.ts`
     - `provisioning.test.ts`
     - `public-registration.test.ts`
     - `rbac.test.ts`
     - `setup-prerequisites.test.ts`
     - `student-management.test.ts`
     - `teaching-assignments.test.ts`
     - `tenant-isolation.test.ts`

---

## 12. Required Verification Commands

Before declaring any coding or refactoring task complete, execute these checks in sequence:

```bash
# 1. Full automated test suite (sequential to prevent DB deadlock)
npm test

# 2. Strict TypeScript type check
npx tsc --noEmit

# 3. ESLint check
npm run lint

# 4. Prettier formatting verification
npm run format

# 5. Prisma schema validation
npx prisma validate

# 6. Production build
npm run build
```

Do not claim a check passed unless it exited with code `0`.

---

## 13. Refactoring Rules

1. **Inspect Before Modifying**: Inspect existing domain services and established conventions before introducing new abstractions.
2. **No Unnecessary Rewrites**: Do not rewrite functioning services solely to change syntax or indentation.
3. **Small Reviewable Batches**: Make changes incrementally; test and verify each batch before moving to the next.
4. **Preserve Public API Contracts**: Never change route paths, HTTP verbs, response shapes, or status codes unless fixing an explicitly documented defect.
5. **No Mocking Out Real Logic**: Never replace real database or service logic with mocks to make tests pass artificially.

---

## 14. Definition of Done

A task is complete only when:

- [ ] Code is placed in its designated domain module or shared library.
- [ ] Multi-tenant isolation and RBAC checks are verified on the server.
- [ ] All 6 verification commands pass cleanly (`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run format`, `npx prisma validate`, `npm run build`).
- [ ] No git diff artifacts or temporary files are left behind.
- [ ] Any architectural updates are documented in `README.md` and `AGENTS.md`.
