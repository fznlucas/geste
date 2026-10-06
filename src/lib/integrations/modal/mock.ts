import { hashString } from "@/sim/random";
import type { ModalAdapter } from "./types";

/**
 * Mock: the job is accepted with a call id; the browser plays the worker while the AI page is open
 * (`advanceJobs`), and its completion is logged as the webhook would be.
 */
export const modalMock: ModalAdapter = {
  submitJob: async ({ number }) => ({ callId: `fc-${(hashString(`job-${number}`) >>> 0).toString(36).padStart(7, "0").slice(0, 7)}` }),
};
