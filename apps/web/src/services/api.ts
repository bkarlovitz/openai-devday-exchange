import { createApiClient } from "@council/contracts";

export const { saveSubmission, loadRun, loadClaim, retryRun, changeLanguage } = createApiClient();
