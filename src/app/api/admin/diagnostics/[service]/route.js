import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { DIAGNOSTIC_SERVICES, diagnostics } from "@/lib/services/diagnostics";
import { validateJsonBody } from "@/lib/validation";
import { emailSchema } from "@/lib/validation/schemas/common";

const bodySchema = z
  .object({
    // email: optionally send a real test message to this address
    sendTo: emailSchema.optional(),
    // whatsapp: send a real test message to the admin WhatsApp number
    send: z.boolean().optional(),
  })
  .strict();

/** Admin-only integration check. Responses never contain credentials. */
export const POST = apiHandler(
  async ({ request, params }) => {
    if (!DIAGNOSTIC_SERVICES.includes(params.service)) throw new NotFoundError("Unknown diagnostic.");
    const options = await validateJsonBody(request, bodySchema);
    return diagnostics[params.service](options);
  },
  { auth: "admin" },
);
