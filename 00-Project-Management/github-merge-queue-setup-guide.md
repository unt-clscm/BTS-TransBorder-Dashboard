# GitHub Merge Queue Setup Guide

A portable, step-by-step guide for enabling GitHub's native merge queue on any
project where multiple Claude Code agents (or other automated tools) work
concurrently and need to merge to a shared main branch without collisions.


## Prerequisites

Before starting, gather the following for your specific project:

  REPO_OWNER:      GitHub username or org that owns the repo
  REPO_NAME:       Repository name
  GH_ACCOUNT:      The gh CLI account with admin access to the repo
  BASE_BRANCH:     The branch to protect (usually "main")
  BUILD_COMMAND:   The command that validates the project builds correctly
  WORKING_DIR:     The subdirectory where the build runs (or "." for root)
  NODE_VERSION:    (If applicable) Node.js version for the CI runner
  PACKAGE_MANAGER: npm, yarn, pnpm, pip, cargo, etc.
  VITE_BASE:       (If applicable) Base URL env var for Vite builds

  Repo visibility: PUBLIC repos can use merge queue on GitHub Free plan.
                   PRIVATE repos require GitHub Team plan or higher.

  gh CLI:          Must be installed and authenticated with the admin account.
                   Run "gh auth status" to verify.


## Step 1: Create a CI Check Workflow

Create the file .github/workflows/ci.yml in your repository.

This workflow is SEPARATE from any deploy workflow. It only validates that the
project builds -- it does NOT deploy anything.

The workflow must trigger on TWO events:
  - pull_request (targeting your base branch) -- validates PRs before queue entry
  - merge_group -- validates the merged result inside the queue

TEMPLATE (adapt to your project's build system):

  name: CI

  on:
    pull_request:
      branches: [BASE_BRANCH]
    merge_group:

  jobs:
    build:
      runs-on: ubuntu-latest
      defaults:
        run:
          working-directory: WORKING_DIR
      steps:
        - uses: actions/checkout@v4

        # Add language/runtime setup here (Node, Python, Rust, etc.)
        # Add dependency installation here (npm ci, pip install, cargo build, etc.)
        # Add build/test command here

EXAMPLES FOR COMMON STACKS:

  Node.js / Vite:
    - uses: actions/setup-node@v4
      with:
        node-version: NODE_VERSION
        cache: PACKAGE_MANAGER
        cache-dependency-path: WORKING_DIR/package-lock.json
    - run: npm ci
    - run: npm run build

  Python:
    - uses: actions/setup-python@v5
      with:
        python-version: '3.12'
    - run: pip install -r requirements.txt
    - run: python -m pytest

  Rust:
    - uses: actions-rust-lang/setup-rust-toolchain@v1
    - run: cargo build
    - run: cargo test

WHY SEPARATE FROM DEPLOY?
  Running a deploy workflow on merge_group events would deploy from a temporary
  queue branch -- that's wrong. Deploy workflows should only trigger on push to
  the base branch (which happens AFTER the merge queue successfully merges).

IMPORTANT: The job name "build" under workflow name "CI" creates a status check
context called "CI / build". This is the name you will reference in the ruleset.
If you change the workflow or job name, update the ruleset accordingly.

ORDERING: This file must be on the base branch BEFORE you create the ruleset
(Step 3). If no branch protection exists yet, push it directly. If protection
exists, merge it via PR first.


## Step 2: Register the CI Check Context

GitHub needs to "see" a status check context at least once before it can be
required in a ruleset. After pushing ci.yml to the base branch:

  1. Create a throwaway branch:
     git checkout -b test-ci-check
     (Make a trivial change -- add a comment to any file)
     git add . && git commit -m "Test CI check" && git push -u origin test-ci-check

  2. Open a PR:
     gh pr create --base BASE_BRANCH --title "Test CI" --body "Throwaway PR to register CI check context"

  3. Wait for the "CI / build" check to appear and pass in the PR's checks section.

  4. Close the PR (do not merge):
     gh pr close --delete-branch

This registers "CI / build" in GitHub's system so the ruleset can reference it.


## Step 3: Create Repository Ruleset with Merge Queue

Switch to the admin account:
  gh auth switch --user GH_ACCOUNT

Create the ruleset using the GitHub API:

  gh api repos/REPO_OWNER/REPO_NAME/rulesets \
    -X POST \
    -H "Accept: application/vnd.github+json" \
    --input - << 'EOF'
  {
    "name": "main-merge-queue",
    "target": "branch",
    "enforcement": "active",
    "conditions": {
      "ref_name": {
        "include": ["refs/heads/BASE_BRANCH"],
        "exclude": []
      }
    },
    "bypass_actors": [],
    "rules": [
      {
        "type": "merge_queue",
        "parameters": {
          "check_response_timeout_minutes": 10,
          "grouping_strategy": "ALLGREEN",
          "max_entries_to_merge": 5,
          "merge_method": "MERGE",
          "min_entries_to_merge": 1,
          "min_entries_to_merge_wait_minutes": 0
        }
      },
      {
        "type": "required_status_checks",
        "parameters": {
          "required_status_checks": [
            {
              "context": "CI / build",
              "integration_id": null
            }
          ],
          "strict_required_status_checks_policy": false,
          "do_not_enforce_on_create": true
        }
      }
    ]
  }
  EOF

CONFIGURATION EXPLAINED:

  merge_method: MERGE
    Preserves full commit history. Alternatives: SQUASH, REBASE.

  min_entries_to_merge: 1
    Merge each PR immediately once its check passes. Set higher (e.g., 3)
    if you want to batch multiple PRs into a single merge cycle.

  max_entries_to_merge: 5
    Cap on how many PRs can be batched in one merge cycle.

  min_entries_to_merge_wait_minutes: 0
    Don't wait for more PRs to accumulate. Set higher if batching.

  check_response_timeout_minutes: 10
    How long to wait for CI to report. Adjust based on your build time.
    A build that takes 2 minutes should have a timeout of at least 5-10.

  grouping_strategy: ALLGREEN
    Only merge the batch if ALL checks pass. Alternative: HEADGREEN
    (only the last PR in the batch needs to pass).

  strict_required_status_checks_policy: false
    The queue handles rebasing automatically. Setting to true would force
    agents to manually rebase before entering the queue -- defeats the purpose.

  do_not_enforce_on_create: true
    Allows the initial push to the base branch for repo setup.

  NO pull_request review requirement:
    Do NOT add a "type": "pull_request" rule unless you have human reviewers.
    Agents create PRs programmatically; requiring reviews blocks everything.

TO VERIFY the ruleset was created:
  gh api repos/REPO_OWNER/REPO_NAME/rulesets


## Step 4: Update Agent Instructions (CLAUDE.md or equivalent)

Add these workflow rules to your project's agent instructions file:

BRANCHING WORKFLOW:
  Multiple agents may run concurrently. Each agent must:
    1. Start from latest base branch: git checkout BASE_BRANCH && git pull
    2. Create a feature branch: git checkout -b descriptive-branch-name
    3. Do all work and commit on the feature branch
    4. Push: git push -u origin descriptive-branch-name
    5. Open a PR and auto-merge (see MERGE TO MAIN below)

  Never commit directly to the base branch.

MERGE TO MAIN:
  A GitHub merge queue is configured on BASE_BRANCH. Agents must never merge
  locally or push directly to BASE_BRANCH. Instead:

    1. Ensure the correct gh account: gh auth switch --user GH_ACCOUNT
    2. Open a PR and enable auto-merge:
       gh pr create --base BASE_BRANCH --fill && gh pr merge --auto --merge
       If a PR already exists: gh pr merge --auto --merge
    3. Done. GitHub runs CI, queues the merge, and merges automatically.
       The agent does not need to wait or poll.
    4. On failure: fix the issue on the branch, push, queue re-tests.
       For merge conflicts:
       git pull --rebase origin BASE_BRANCH && git push --force-with-lease

REMOVE any existing file-based lock, polling, or manual merge procedures.


## Step 5: Clean Up

  - Delete any local .git/merge.lock or similar lock files
  - Remove lock file references from agent instructions
  - Remove any merge-related retry/polling logic from scripts


## How It Works End-to-End

  1. Agent creates branch, does work, pushes
  2. Agent runs: gh pr create --fill && gh pr merge --auto --merge
  3. GitHub Actions runs "CI / build" on the pull_request event
  4. If checks pass, PR is added to the merge queue
  5. In the queue, GitHub creates a temporary branch combining:
     - Latest base branch
     - This PR's changes
     - Any PRs already queued ahead of it
  6. GitHub runs "CI / build" again on this combined branch (merge_group event)
  7. If checks pass, PR is merged to the base branch
  8. If checks fail or conflicts detected, PR is ejected from queue
     (agent or user fixes and re-pushes, queue re-tests)
  9. Deploy workflow (if any) fires on the push to base branch


## Verification Checklist

After setup, verify each of these:

  [ ] CI workflow file exists on the base branch
  [ ] Opening a PR triggers "CI / build" check
  [ ] "gh pr merge --auto --merge" adds the PR to the queue
  [ ] Queue merges the PR after checks pass
  [ ] Deploy workflow (if any) triggers after queue merges to base branch
  [ ] A second PR queued while the first is processing waits its turn
  [ ] A PR with merge conflicts is ejected with a clear error message
  [ ] Direct pushes to the base branch are blocked


## Troubleshooting

  PROBLEM: PR hangs with "Waiting for status checks"
  CAUSE: The "CI / build" check context hasn't been registered yet,
         or the workflow doesn't have the merge_group trigger.
  FIX: Ensure ci.yml has "merge_group" in its "on:" block.
       Open a test PR to register the check context.

  PROBLEM: "gh pr merge --auto" returns "auto-merge is not allowed"
  CAUSE: Auto-merge isn't enabled on the repository.
  FIX: Go to repo Settings > General > Pull Requests > check "Allow auto-merge"
       Or via API: gh api repos/OWNER/REPO -X PATCH -f allow_auto_merge=true

  PROBLEM: Ruleset API returns 403
  CAUSE: The active gh account doesn't have admin access.
  FIX: gh auth switch --user ADMIN_ACCOUNT

  PROBLEM: Ruleset API returns 404
  CAUSE: Rulesets may not be available on your plan (private repo on free plan).
  FIX: Make the repo public, or upgrade to GitHub Team plan or higher.

  PROBLEM: Merge queue merges but deploy doesn't trigger
  CAUSE: Deploy workflow only triggers on push events. Merge queue pushes
         to the base branch, which should trigger it. Check that the deploy
         workflow's "on: push: branches:" includes the base branch.

  PROBLEM: Two agents' PRs conflict in the queue
  CAUSE: Normal -- the queue merges the first and ejects the second.
  FIX: The ejected agent (or user) rebases and pushes:
       git pull --rebase origin BASE_BRANCH && git push --force-with-lease


## Pricing Notes

  GitHub Free plan:  Merge queue works on PUBLIC repositories only
  GitHub Team:       Merge queue works on both public AND private repos
  GitHub Enterprise: Same as Team, plus org-level rulesets, audit log streaming,
                     bypass lists, and required deployment gates

  If your repo is private and you're on a free plan, alternatives:
    - Make the repo public (if appropriate)
    - Use Mergify (free tier supports merge queue for open source)
    - Use the file-based lock approach (see legacy instructions)
    - Upgrade to GitHub Team


## References

  GitHub Docs - Managing a merge queue:
    https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue

  GitHub Docs - Merging a PR with a merge queue:
    https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/merging-a-pull-request-with-a-merge-queue

  GitHub Blog - Merge queue GA announcement:
    https://github.blog/news-insights/product-news/github-merge-queue-is-generally-available/

  gh CLI - pr merge:
    https://cli.github.com/manual/gh_pr_merge
