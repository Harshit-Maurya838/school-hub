import { describe, it, after } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth.js";
import { GET as getProfileHandler } from "../src/app/api/v1/school/[schoolSlug]/profile/master/route.js";
import { PUT as saveStepHandler } from "../src/app/api/v1/school/[schoolSlug]/profile/master/steps/[step]/route.js";
import { POST as lockHandler } from "../src/app/api/v1/school/[schoolSlug]/profile/master/lock/route.js";

const CODES = ["PROF_TEST_A", "PROF_TEST_B"];
const EMAILS = [
  "adminA_prof@test.edu",
  "adminB_prof@test.edu",
  "teacherA_prof@test.edu",
  "super_prof@test.edu",
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

const base = (slug: string) => `http://localhost:3000/api/v1/school/${slug}/profile/master`;

async function saveStep(slug: string, step: string, token: string | undefined, body: unknown) {
  return saveStepHandler(req(`${base(slug)}/steps/${step}`, { method: "PUT", token, body }), {
    params: Promise.resolve({ schoolSlug: slug, step }),
  });
}

async function setLock(slug: string, token: string | undefined, locked: unknown) {
  return lockHandler(req(`${base(slug)}/lock`, { method: "POST", token, body: { locked } }), {
    params: Promise.resolve({ schoolSlug: slug }),
  });
}

const validIdentity = {
  name: "Deepti Montessori School",
  nameHindi: "दीप्ति मोंटेसरी स्कूल",
  udiseCode: "09260100000",
  establishmentYear: 1998,
  recognitionNumber: "REC-UP-88741/2023",
  officialEmail: "Info@DeeptiMontessori.com",
  contactMobile: "+91 96161 99559",
  postalAddress: "84 Phool Bagh Colony, Kursi Road, Lucknow, Uttar Pradesh - 226022",
};

const validAcademic = {
  instructionMedium: "ENGLISH",
  classRange: "CLASS_1_TO_12",
  includesPrePrimary: true,
  rteApplicable: true,
  rteEntryClass: "NURSERY",
  rteExitClass: "CLASS_8",
  boardAffiliation: "STATE_BOARD",
  stateBoardName: "UP Board",
  streams: ["SCIENCE", "COMMERCE"],
};

const validLeadership = {
  hosDesignation: "PRINCIPAL",
  hosName: "Arvind Maurya",
  hosMobile: "9616199559",
  hosEmail: "principal@deeptimontessori.com",
  managementName: "Deeptimayee Educational Trust",
  managementPhone: "0522 2345678",
};

async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { school: { code: { in: CODES } } } });
  await prisma.schoolProfile.deleteMany({ where: { school: { code: { in: CODES } } } });
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  await prisma.school.deleteMany({ where: { code: { in: CODES } } });
}

describe("Master School Profile: step saves, validation, locking and isolation", () => {
  let schoolA: { id: string; slug: string };
  let schoolB: { id: string; slug: string };
  let tokenAdminA: string;
  let tokenAdminB: string;
  let tokenTeacherA: string;
  let tokenSuper: string;

  after(cleanup);

  it("sets up isolated schools and users", async () => {
    await cleanup();
    schoolA = await prisma.school.create({
      data: { name: "Profile School Alpha", code: CODES[0], slug: "profile-school-alpha" },
    });
    schoolB = await prisma.school.create({
      data: { name: "Profile School Beta", code: CODES[1], slug: "profile-school-beta" },
    });
    const adminA = await prisma.user.create({
      data: { name: "Admin A", email: EMAILS[0], role: "SCHOOL_ADMIN", schoolId: schoolA.id },
    });
    const adminB = await prisma.user.create({
      data: { name: "Admin B", email: EMAILS[1], role: "SCHOOL_ADMIN", schoolId: schoolB.id },
    });
    const teacherA = await prisma.user.create({
      data: { name: "Teacher A", email: EMAILS[2], role: "TEACHER", schoolId: schoolA.id },
    });
    const superAdmin = await prisma.user.create({
      data: { name: "Super", email: EMAILS[3], role: "SUPER_ADMIN", schoolId: null },
    });
    tokenAdminA = await createSessionToken({
      userId: adminA.id,
      schoolId: schoolA.id,
      role: "SCHOOL_ADMIN",
      email: EMAILS[0],
    });
    tokenAdminB = await createSessionToken({
      userId: adminB.id,
      schoolId: schoolB.id,
      role: "SCHOOL_ADMIN",
      email: EMAILS[1],
    });
    tokenTeacherA = await createSessionToken({
      userId: teacherA.id,
      schoolId: schoolA.id,
      role: "TEACHER",
      email: EMAILS[2],
    });
    tokenSuper = await createSessionToken({
      userId: superAdmin.id,
      schoolId: null,
      role: "SUPER_ADMIN",
      email: EMAILS[3],
    });
  });

  it("returns an empty, incomplete profile before anything is saved", async () => {
    const res = await getProfileHandler(req(base(schoolA.slug), { token: tokenAdminA }), {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(res.status, 200);
    const { data } = await res.json();
    assert.strictEqual(data.profile.identity.name, "Profile School Alpha");
    assert.strictEqual(data.profile.isComplete, false);
    assert.strictEqual(data.profile.lock.isLocked, false);
  });

  it("rejects unauthenticated, teacher and cross-tenant writes", async () => {
    assert.strictEqual(
      (await saveStep(schoolA.slug, "identity", undefined, validIdentity)).status,
      401
    );
    assert.strictEqual(
      (await saveStep(schoolA.slug, "identity", tokenTeacherA, validIdentity)).status,
      403
    );
    assert.strictEqual(
      (await saveStep(schoolA.slug, "identity", tokenAdminB, validIdentity)).status,
      403
    );
    assert.strictEqual(
      (await saveStep(schoolA.slug, "identity", tokenSuper, validIdentity)).status,
      403
    );

    const crossRead = await getProfileHandler(req(base(schoolA.slug), { token: tokenAdminB }), {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(crossRead.status, 403);
  });

  it("returns 404 for an unknown step", async () => {
    const res = await saveStep(schoolA.slug, "finance", tokenAdminA, validIdentity);
    assert.strictEqual(res.status, 404);
  });

  it("validates identity fields", async () => {
    const badUdise = await saveStep(schoolA.slug, "identity", tokenAdminA, {
      ...validIdentity,
      udiseCode: "0926010",
    });
    assert.strictEqual(badUdise.status, 422);

    const badMobile = await saveStep(schoolA.slug, "identity", tokenAdminA, {
      ...validIdentity,
      contactMobile: "12345",
    });
    assert.strictEqual(badMobile.status, 422);

    const futureYear = await saveStep(schoolA.slug, "identity", tokenAdminA, {
      ...validIdentity,
      establishmentYear: new Date().getFullYear() + 1,
    });
    assert.strictEqual(futureYear.status, 422);
  });

  it("saves identity, normalises contact data, renames the school and audits", async () => {
    const res = await saveStep(schoolA.slug, "identity", tokenAdminA, validIdentity);
    assert.strictEqual(res.status, 200);
    const { data } = await res.json();
    assert.strictEqual(data.profile.identity.officialEmail, "info@deeptimontessori.com");
    assert.strictEqual(data.profile.identity.contactMobile, "+919616199559");
    assert.strictEqual(data.profile.completion.identity, true);

    const school = await prisma.school.findUnique({ where: { id: schoolA.id } });
    assert.strictEqual(school?.name, "Deepti Montessori School");

    const audit = await prisma.auditLog.findFirst({
      where: { schoolId: schoolA.id, action: "SCHOOL_PROFILE_UPDATED" },
    });
    assert.ok(audit, "profile update should be audited");
  });

  it("rejects a U-DISE code already used by another school", async () => {
    const res = await saveStep(schoolB.slug, "identity", tokenAdminB, {
      ...validIdentity,
      name: "Profile School Beta",
    });
    assert.strictEqual(res.status, 409);
  });

  it("enforces academic cross-field rules", async () => {
    const streamsBelow12 = await saveStep(schoolA.slug, "academic", tokenAdminA, {
      ...validAcademic,
      classRange: "CLASS_1_TO_8",
      rteExitClass: "CLASS_8",
      streams: ["SCIENCE"],
    });
    assert.strictEqual(streamsBelow12.status, 422);

    const noStreamsFor12 = await saveStep(schoolA.slug, "academic", tokenAdminA, {
      ...validAcademic,
      streams: [],
    });
    assert.strictEqual(noStreamsFor12.status, 422);

    const rteExitAboveRange = await saveStep(schoolA.slug, "academic", tokenAdminA, {
      ...validAcademic,
      classRange: "CLASS_1_TO_5",
      rteExitClass: "CLASS_8",
      streams: [],
    });
    assert.strictEqual(rteExitAboveRange.status, 422);

    const nurseryWithoutPrePrimary = await saveStep(schoolA.slug, "academic", tokenAdminA, {
      ...validAcademic,
      includesPrePrimary: false,
    });
    assert.strictEqual(nurseryWithoutPrePrimary.status, 422);

    const rteForSecondaryOnly = await saveStep(schoolA.slug, "academic", tokenAdminA, {
      ...validAcademic,
      classRange: "CLASS_9_TO_12",
      includesPrePrimary: false,
      rteEntryClass: "CLASS_1",
    });
    assert.strictEqual(rteForSecondaryOnly.status, 422);

    const stateBoardWithoutName = await saveStep(schoolA.slug, "academic", tokenAdminA, {
      ...validAcademic,
      stateBoardName: "",
    });
    assert.strictEqual(stateBoardWithoutName.status, 422);
  });

  it("saves academic setup and clears RTE classes when RTE is off", async () => {
    const res = await saveStep(schoolA.slug, "academic", tokenAdminA, {
      ...validAcademic,
      rteApplicable: false,
    });
    assert.strictEqual(res.status, 200);
    const { data } = await res.json();
    assert.strictEqual(data.profile.academic.rteEntryClass, null);
    assert.strictEqual(data.profile.academic.rteExitClass, null);
    assert.deepStrictEqual(data.profile.academic.streams, ["SCIENCE", "COMMERCE"]);

    const full = await saveStep(schoolA.slug, "academic", tokenAdminA, validAcademic);
    assert.strictEqual(full.status, 200);
  });

  it("refuses to lock an incomplete profile", async () => {
    const res = await setLock(schoolA.slug, tokenAdminA, true);
    assert.strictEqual(res.status, 400);
    assert.strictEqual((await res.json()).error.code, "SETUP_PREREQUISITE_REQUIRED");
  });

  it("saves leadership and marks the profile complete", async () => {
    const res = await saveStep(schoolA.slug, "leadership", tokenAdminA, validLeadership);
    assert.strictEqual(res.status, 200);
    const { data } = await res.json();
    assert.strictEqual(data.profile.isComplete, true);
    assert.strictEqual(data.profile.leadership.managementPhone, "+915222345678");
  });

  it("prevents teachers and other schools from locking", async () => {
    assert.strictEqual((await setLock(schoolA.slug, tokenTeacherA, true)).status, 403);
    assert.strictEqual((await setLock(schoolA.slug, tokenAdminB, true)).status, 403);
    assert.strictEqual((await setLock(schoolA.slug, tokenAdminA, "yes")).status, 422);
  });

  it("locks the profile, blocks edits, and audits lock and unlock", async () => {
    const lock = await setLock(schoolA.slug, tokenAdminA, true);
    assert.strictEqual(lock.status, 200);
    const { data } = await lock.json();
    assert.strictEqual(data.profile.lock.isLocked, true);
    assert.strictEqual(data.profile.lock.lockedByName, "Admin A");

    const blocked = await saveStep(schoolA.slug, "leadership", tokenAdminA, validLeadership);
    assert.strictEqual(blocked.status, 409);
    assert.strictEqual((await blocked.json()).error.code, "SCHOOL_PROFILE_LOCKED");

    const unlock = await setLock(schoolA.slug, tokenSuper, false);
    assert.strictEqual(unlock.status, 200);
    assert.strictEqual((await unlock.json()).data.profile.lock.isLocked, false);

    const actions = await prisma.auditLog.findMany({
      where: {
        schoolId: schoolA.id,
        action: { in: ["SCHOOL_PROFILE_LOCKED", "SCHOOL_PROFILE_UNLOCKED"] },
      },
      select: { action: true },
    });
    assert.deepStrictEqual(actions.map((a) => a.action).sort(), [
      "SCHOOL_PROFILE_LOCKED",
      "SCHOOL_PROFILE_UNLOCKED",
    ]);

    const editable = await saveStep(schoolA.slug, "leadership", tokenAdminA, validLeadership);
    assert.strictEqual(editable.status, 200);
  });

  it("lets teachers read their own school's profile", async () => {
    const res = await getProfileHandler(req(base(schoolA.slug), { token: tokenTeacherA }), {
      params: Promise.resolve({ schoolSlug: schoolA.slug }),
    });
    assert.strictEqual(res.status, 200);
  });
});
