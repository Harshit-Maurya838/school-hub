import { NextRequest } from "next/server";
import { apiHandler, RouteContext } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { BadRequestError } from "@/lib/errors";
import { requireAuth } from "@/lib/rbac";
import { InvoiceStatus } from "@/generated/prisma/enums";
import { resolveSchoolForFees, getInvoices, generateInvoicesFromStructure } from "@/lib/fees";

type Context = RouteContext<{ schoolSlug: string }>;

export const GET = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  if (!schoolSlug) throw new BadRequestError("Missing schoolSlug in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(schoolSlug, user);

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId") || undefined;
  const academicYearId = searchParams.get("academicYearId") || undefined;
  const classId = searchParams.get("classId") || undefined;
  const status = (searchParams.get("status") as InvoiceStatus) || undefined;
  const search = searchParams.get("search") || undefined;
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

  const result = await getInvoices(school.id, user, {
    studentId,
    academicYearId,
    classId,
    status,
    search,
    page,
    limit,
  });

  return successResponse(result.invoices, result.pagination);
});

export const POST = apiHandler(async (req: NextRequest, context?: Context) => {
  const params = await context?.params;
  const schoolSlug = params?.schoolSlug;
  if (!schoolSlug) throw new BadRequestError("Missing schoolSlug in route");

  const user = await requireAuth(req);
  const school = await resolveSchoolForFees(schoolSlug, user);

  const body = await req.json();
  const result = await generateInvoicesFromStructure(school.id, user, {
    feeStructureId: body.feeStructureId,
    academicYearId: body.academicYearId,
    classId: body.classId,
    studentIds: body.studentIds,
    billingPeriod: body.billingPeriod,
    issueDate: body.issueDate,
    dueDate: body.dueDate,
    notes: body.notes,
  });

  return successResponse(result, undefined, 201);
});
