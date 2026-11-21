# Verification execution

Run project checks locally. Do not add or use GitHub Actions for company projects. A future remote runner requires an explicit policy change; do not provision one during implementation.

Keep the checks in documented repository commands (normally npm scripts), including the setup needed for isolated test dependencies. A future runner should invoke those same commands. Select checks appropriate to the change; yook governs behavioral proof, independent review, and delivery.

Record the tested commit, commands, outcomes, and evidence. Missing remote checks do not mean verification passed. Respect existing repository protections; report a conflicting required remote check rather than bypassing it.

Existing projects adopt this policy deliberately with their other standards and source receipt.
