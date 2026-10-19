import { apiHandler } from "@/lib/api-handler";
import { BadRequestError } from "@/lib/errors";

export const POST = apiHandler(async () => {
  throw new BadRequestError(
    "Password reset email delivery transport is not configured for this deployment. Please contact your system administrator."
  );
});
