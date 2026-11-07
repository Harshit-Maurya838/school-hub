# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **School admins and office staff** (primary): set up the school (sessions, classes, sections, subjects), admit students, invite staff and parents, and run fee collection at the office counter. They use the product all day at a desk.
- **Teachers** (primary, daily): take attendance for their sections and enter marks for subjects they are assigned to. They need short, frequent, focused tasks.
- **Accountants**: record offline payments (cash, bank transfer, cheque, DD), issue receipts, and handle concessions, reversals, and refunds.
- **Principal or school owner**: decides whether the school buys the product; reviews dashboards and readiness.
- **Parents and students**: secondary audiences who see published results and their own records.
- **Platform super admin**: reviews and approves school registrations; works only at platform scope.

## Product Purpose

Classic Giga gives small and mid-sized private schools in India one system for academics, students, staff, attendance, examinations, and fees, replacing registers, spreadsheets, and ad hoc tools. It succeeds when a school can onboard itself, run daily attendance and term exams without disputes, and collect fees with records that reconcile.

## Positioning

Built for correctness and accountability. Attendance registers lock once submitted, marks go through review before they are published, invoices are immutable snapshots, every payment gets a sequential receipt, and every correction, reversal, or refund leaves an audit trail. Each school's data is strictly isolated from other schools. When a parent or an auditor asks "who changed this and why," the school can answer.

## Operating Context

- Indian K-12 schools (CBSE and state-board private schools). Currency is ₹ (INR); students carry APAAR IDs and admission numbers.
- Fees are collected offline at the school office; the product records payments, it does not process them.
- Work follows academic sessions and the term exam cycle: setup at session start, attendance every day, marks entry and publication at exam time, and fee collection around due dates.
- Schools onboard themselves: public registration, email verification, super-admin approval, invitations, then a readiness checklist.

## Capabilities and Constraints

- Six roles: `SUPER_ADMIN`, `SCHOOL_ADMIN`, `ACCOUNTANT`, `TEACHER`, `PARENT`, `STUDENT`. Teachers act only on their assigned sections and subjects.
- Workflow states matter to users: attendance `DRAFT` → `SUBMITTED` (locked, with audited corrections); marks entry → review → approval/return → publication (post-publication changes are audited).
- Financial records are never edited in place. Changes go through adjustments, cancellations, reversals, or refunds, each with a stated reason.
- Terminology to use: session (academic year), class, section, subject, register, admission number, APAAR ID, fee head, fee structure, invoice, receipt (`REC-YYYYMMDD-XXXX`), concession.
- Stack: Next.js 16 App Router, React 19, Tailwind CSS 4, PostgreSQL/Prisma, Redis.

## Brand Commitments

- Product name: **Classic Giga**. The codebase still says "CampusPulse" (README, AGENTS.md) and "CampusPlus" (app metadata, landing page); both are outdated and should be renamed when that copy is touched.
- No logo or brand assets exist yet (`public/` only holds Next.js defaults).

## Evidence on Hand

- Demo data comes from `npm run db:seed` (realistic multi-tenant seed).
- There are no real customers, testimonials, school logos, metrics, or pricing yet. Do not invent them.

## Product Principles

1. **The record is the product.** Locked registers, immutable invoices, and audit trails are the core value; the UI should make state and history obvious, never hide them.
2. **Daily tasks are fast.** Taking attendance and entering marks happen every day or every term for many sections; they should take as few steps as possible.
3. **The current state is always visible.** Draft, submitted, locked, published, cancelled, reversed: users should always know where something stands and what they are allowed to do next.
4. **Built for small office teams.** Assume no dedicated IT staff; setup and onboarding have to guide the school step by step.
5. **Show only what the role allows.** Each role sees what it can act on; permissions are enforced on the server, and the interface should match them.
