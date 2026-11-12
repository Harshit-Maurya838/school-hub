import { describe, it, after } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/modules/auth/services/auth.js";
import {
  GET as getPlanHandler,
  PUT as savePlanHandler,
} from "../src/app/api/v1/school/[schoolSlug]/fees/class-plans/[classId]/route.js";
import { GET as getSetupHandler } from "../src/app/api/v1/school/[schoolSlug]/academics/setup/route.js";
import { summarisePlan } from "../src/modules/fees/services/class-fee-plan-rules.js";

const CODES = ["CFPLAN_A", "CFPLAN_B"];
const EMAILS = [
  "admin_a@cfplan.test",
  "accountant_a@cfplan.test",
  "teacher_a@cfplan.test",
  "admin_b@cfplan.test",
];

function req(url: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const headers = new Headers();
  if (options.token) headers.set("Cookie", `${SESSION_COOKIE_NAME}=${options.token}`);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  return new NextRequest(url, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

const api = (slug: string) => `http://localhost:3000/api/v1/school/${slug}`;
const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

const getPlan = (slug: string, classId: string, token?: string) =>
  getPlanHandler(
    req(`${api(slug)}/fees/class-plans/${classId}`, { token }),
    ctx({ schoolSlug: slug, classId })
  );
const savePlan = (slug: string, classId: string, token: string | undefined, body: unknown) =>
  savePlanHandler(
    req(`${api(slug)}/fees/class-plans/${classId}`, { method: "PUT", token, body }),
    ctx({ schoolSlug: slug, classId })
  );
const getSetup = (slug: string, token: string) =>
  getSetupHandler(req(`${api(slug)}/academics/setup`, { token }), ctx({ schoolSlug: slug }));

async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { school: { code: { in: CODES } } } });
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  await prisma.school.deleteMany({ where: { code: { in: CODES } } });
}

describe("Class fee plan rules", () => {
  it("reads tuition as the monthly fee, admission as one-time and the rest as additional", () => {
    const plan = summarisePlan([
      {
        feeHeadId: "t",
        headName: "Tuition Fee",
        headCode: null,
        amount: "1500",
        frequency: "MONTHLY",
      },
      {
        feeHeadId: "a",
        headName: "Admission",
        headCode: "ADMN",
        amount: "5000",
        frequency: "ONE_TIME",
      },
      {
        feeHeadId: "t",
        headName: "Tuition Fee",
        headCode: null,
        amount: "300",
        frequency: "ANNUAL",
      },
      { feeHeadId: "x", headName: "Exam Fee", headCode: null, amount: "800", frequency: "TERM" },
    ]);
    assert.strictEqual(plan.monthlyFee, "1500");
    assert.strictEqual(plan.admissionFee, "5000");
    assert.deepStrictEqual(
      plan.additional.map((a) => `${a.headName}:${a.frequency}`),
      ["Tuition Fee:ANNUAL", "Exam Fee:TERM"]
    );
  });
});

describe("Class fee plan API", () => {
  let schoolA: { id: string; slug: string };
  let schoolB: { id: string; slug: string };
  let classA: string;
  let classB: string;
  let tokenAdminA: string;
  let tokenAccountantA: string;
  let tokenTeacherA: string;
  let tokenAdminB: string;

  after(cleanup);

  it("sets up isolated schools, a session, classes and users", async () => {
    await cleanup();
    schoolA = await prisma.school.create({
      data: { name: "Fee Plan Alpha", code: CODES[0], slug: "cfplan-alpha" },
    });
    schoolB = await prisma.school.create({
      data: { name: "Fee Plan Beta", code: CODES[1], slug: "cfplan-beta" },
    });
    for (const school of [schoolA, schoolB]) {
      await prisma.academicYear.create({
        data: {
          schoolId: school.id,
          name: "2026-27",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2027-03-31"),
          isCurrent: true,
        },
      });
    }
    classA = (
      await prisma.class.create({
        data: { schoolId: schoolA.id, name: "Class 3", numericOrder: 5 },
      })
    ).id;
    classB = (
      await prisma.class.create({
        data: { schoolId: schoolB.id, name: "Class 3", numericOrder: 5 },
      })
    ).id;

    const roles = [
      ["SCHOOL_ADMIN", schoolA.id],
      ["ACCOUNTANT", schoolA.id],
      ["TEACHER", schoolA.id],
      ["SCHOOL_ADMIN", schoolB.id],
    ] as const;
    const tokens = await Promise.all(
      roles.map(async ([role, schoolId], i) => {
        const user = await prisma.user.create({
          data: { name: `User ${i}`, email: EMAILS[i], role, schoolId },
        });
        return createSessionToken({ userId: user.id, schoolId, role, email: EMAILS[i] });
      })
    );
    [tokenAdminA, tokenAccountantA, tokenTeacherA, tokenAdminB] = tokens;
  });

  it("starts empty", async () => {
    const res = await getPlan(schoolA.slug, classA, tokenAdminA);
    assert.strictEqual(res.status, 200);
    const { plan } = (await res.json()).data;
    assert.strictEqual(plan.monthlyFee, null);
    assert.strictEqual(plan.admissionFee, null);
    assert.deepStrictEqual(plan.additional, []);
    assert.strictEqual(plan.academicYear.name, "2026-27");
  });

  it("saves monthly, admission and additional costs as one structure per frequency", async () => {
    const res = await savePlan(schoolA.slug, classA, tokenAdminA, {
      monthlyFee: "1500",
      admissionFee: "5000.50",
      additional: [
        { newHeadName: "Exam Fee", amount: "800", frequency: "TERM" },
        { newHeadName: "Annual Day", amount: "1200", frequency: "ANNUAL" },
      ],
    });
    assert.strictEqual(res.status, 200);
    const { plan } = (await res.json()).data;
    assert.strictEqual(plan.monthlyFee, "1500");
    assert.strictEqual(plan.admissionFee, "5000.5");
    assert.deepStrictEqual(
      plan.additional.map((a: { headName: string; amount: string; frequency: string }) =>
        [a.headName, a.amount, a.frequency].join(":")
      ),
      ["Exam Fee:800:TERM", "Annual Day:1200:ANNUAL"]
    );

    const structures = await prisma.feeStructure.findMany({
      where: { schoolId: schoolA.id, classId: classA, isActive: true },
      include: { items: true },
    });
    assert.deepStrictEqual(structures.map((s) => s.frequency).sort(), [
      "ANNUAL",
      "MONTHLY",
      "ONE_TIME",
      "TERM",
    ]);
    const heads = await prisma.feeHead.findMany({ where: { schoolId: schoolA.id } });
    assert.deepStrictEqual(heads.map((h) => h.name).sort(), [
      "Admission Fee",
      "Annual Day",
      "Exam Fee",
      "Tuition Fee",
    ]);
  });

  it("updates in place on re-save and retires frequencies that are emptied", async () => {
    const exam = await prisma.feeHead.findFirstOrThrow({
      where: { schoolId: schoolA.id, name: "Exam Fee" },
    });
    const res = await savePlan(schoolA.slug, classA, tokenAdminA, {
      monthlyFee: "1600",
      admissionFee: null,
      additional: [{ feeHeadId: exam.id, amount: "900", frequency: "TERM" }],
    });
    assert.strictEqual(res.status, 200);
    const { plan } = (await res.json()).data;
    assert.strictEqual(plan.monthlyFee, "1600");
    assert.strictEqual(plan.admissionFee, null);
    assert.strictEqual(plan.additional.length, 1);

    const all = await prisma.feeStructure.findMany({
      where: { schoolId: schoolA.id, classId: classA },
    });
    assert.strictEqual(all.length, 4, "no duplicate structures are created");
    assert.deepStrictEqual(
      all
        .filter((s) => s.isActive)
        .map((s) => s.frequency)
        .sort(),
      ["MONTHLY", "TERM"]
    );

    // Bringing admission back reuses the retired structure instead of clashing with its name.
    const again = await savePlan(schoolA.slug, classA, tokenAdminA, {
      monthlyFee: "1600",
      admissionFee: "4000",
      additional: [{ feeHeadId: exam.id, amount: "900", frequency: "TERM" }],
    });
    assert.strictEqual(again.status, 200);
    assert.strictEqual(
      await prisma.feeStructure.count({ where: { schoolId: schoolA.id, classId: classA } }),
      4
    );
  });

  it("shows fees in the setup overview to admins but not to teachers", async () => {
    const admin = (await (await getSetup(schoolA.slug, tokenAdminA)).json()).data.overview;
    assert.strictEqual(admin.includesFees, true);
    assert.strictEqual(admin.rows[0].fees.monthlyFee, "1600");

    const teacher = (await (await getSetup(schoolA.slug, tokenTeacherA)).json()).data.overview;
    assert.strictEqual(teacher.includesFees, false);
    assert.strictEqual(teacher.rows[0].fees, null);
  });

  it("rejects duplicate heads and invalid amounts", async () => {
    const exam = await prisma.feeHead.findFirstOrThrow({
      where: { schoolId: schoolA.id, name: "Exam Fee" },
    });
    const dup = await savePlan(schoolA.slug, classA, tokenAdminA, {
      monthlyFee: null,
      admissionFee: null,
      additional: [
        { feeHeadId: exam.id, amount: "100", frequency: "TERM" },
        { newHeadName: "exam fee", amount: "200", frequency: "TERM" },
      ],
    });
    assert.strictEqual(dup.status, 400);

    for (const bad of ["-5", "12.345", "0", "abc"]) {
      const res = await savePlan(schoolA.slug, classA, tokenAdminA, {
        monthlyFee: bad,
        admissionFee: null,
        additional: [],
      });
      assert.strictEqual(res.status, 422, `amount ${bad} is rejected`);
    }
    // Nothing changed after the failed saves.
    const { plan } = (await (await getPlan(schoolA.slug, classA, tokenAdminA)).json()).data;
    assert.strictEqual(plan.monthlyFee, "1600");
  });

  it("lets accountants read but only school admins save", async () => {
    assert.strictEqual((await getPlan(schoolA.slug, classA, tokenAccountantA)).status, 200);
    const body = { monthlyFee: "1", admissionFee: null, additional: [] };
    assert.strictEqual((await savePlan(schoolA.slug, classA, tokenAccountantA, body)).status, 403);
    assert.strictEqual((await savePlan(schoolA.slug, classA, tokenTeacherA, body)).status, 403);
    assert.strictEqual((await getPlan(schoolA.slug, classA, tokenTeacherA)).status, 403);
    assert.strictEqual((await savePlan(schoolA.slug, classA, undefined, body)).status, 401);
  });

  it("keeps schools apart", async () => {
    const body = { monthlyFee: "1", admissionFee: null, additional: [] };
    // Another school's admin, on this school's URL.
    assert.strictEqual((await getPlan(schoolA.slug, classA, tokenAdminB)).status, 403);
    // Own school's URL, other school's class.
    assert.strictEqual((await savePlan(schoolB.slug, classA, tokenAdminB, body)).status, 404);
    // Another school's fee head cannot be borrowed.
    const exam = await prisma.feeHead.findFirstOrThrow({
      where: { schoolId: schoolA.id, name: "Exam Fee" },
    });
    const res = await savePlan(schoolB.slug, classB, tokenAdminB, {
      monthlyFee: null,
      admissionFee: null,
      additional: [{ feeHeadId: exam.id, amount: "100", frequency: "TERM" }],
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(await prisma.feeStructure.count({ where: { schoolId: schoolB.id } }), 0);
  });
});
