# Secret Scanning & Push Protection Safety

1. **Zero Secret Patterns in Test Assertions**:
   - Never embed realistic credential strings or revoked keys in test suites, even inside negative assertions (e.g., checking that a template file lacks real keys).
   - Instead, assert on expected placeholder formats (e.g., `assert.match(content, /S3_ACCESS_KEY=your-aws-access-key-id/)`) or validate variable structure using generic regex patterns.

2. **Remediating Blocked Pushes**:
   - If GitHub Push Protection blocks a push due to a pattern in unpushed commits, perform a clean mixed reset to the remote branch (`git reset <remote>/<branch>`), sanitize the working tree, and recommit so that the flagged string never exists in any commit object in the history.
