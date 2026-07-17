# CI / Release 流水线 — 执行文档

日期： 2026-07-18

## 分支 / 检查工作流

```
main (受保护, 生产)          ◄── 发布晋升 PR (pre-release → main, 需 CI Gate)
  ▲
pre-release (受保护, 集成)   ◄── 任务 PR (ci/*, feat/*, fix/* → pre-release, 需 CI Gate)
  ▲
任务分支                     从最新 pre-release 创建
```

1. 从最新 `pre-release` 创建任务分支（本次任务：`ci/release-pipeline`）。
2. 在任务分支上提交、推送、开 PR 到 `pre-release`，等 `CI Gate` 通过后合并。
3. 发布时开 `pre-release → main` 的 PR，等 `CI Gate` 通过后合并。
4. 合并到 `main` 触发 `Release` 工作流，自动创建日期时间版本的 GitHub Release。

## 实现内容

### `.github/workflows/ci.yml`（PR 检查）

- 触发：目标为 `main` 或 `pre-release` 的 PR。
- `theme-app-build` job：用 `git ls-files '*/app/package.json'` 发现所有主题应用，逐个 `npm ci` → `npm run lint` → `npm run build`。无应用时跳过并成功。
- `ci-gate` job：`needs` 所有检查 job，`if: always()`，任一非 success 即失败。
  - 分支保护只要求 `CI Gate` 这一个检查：将来新增检查 job 时只需在 `needs` 中登记，无需改 GitHub 分支保护设置。

### `.github/workflows/release.yml`（发布）

- 触发：push 到 `main`（即发布晋升 PR 合并后），或手动 `workflow_dispatch`。
- 版本：`vYYYY.MM.DD-HHMM`（UTC），同分钟冲突时追加 `-2`、`-3` 序号。
- 用 `gh release create --generate-notes` 自动生成 release notes（基于合并的 PR）。
- `concurrency: release-main` 防止并发发布产生重复 tag。

### 分支保护（GitHub rulesets，通过 `gh api` 配置）

- ruleset `protect-main`：目标 `main`；ruleset `protect-pre-release`：目标 `pre-release`。
- 规则：`deletion`、`non_fast_forward`（禁 force push）、`pull_request`（必须 PR）、`required_status_checks` 要求 `CI Gate`。

## 重要决策

- **为什么用 ruleset 而不是经典 branch protection**：ruleset 可以列出、审计，且对两个分支复用同一套规则模式更清晰。
- **为什么单一 `CI Gate` 作为必需检查**：GitHub 必需检查按 job 名匹配；新增 job 时改 ruleset 容易遗漏，gate job 把"哪些检查必需"的权威定义放在仓库内的 CI 文件里。
- **为什么 lint + build 作为"基本检查"**：主题应用无测试套件，lint 与 `tsc -b && vite build` 是当前可验证的最高标准；后续添加测试后只需在 CI 中追加步骤。
- **UTC 时间戳**：避免本地时区差异导致版本号不一致。

## 验证命令

```bash
# 本地验证 CI 等效命令
npm --prefix Pokemon/app ci && npm --prefix Pokemon/app run lint && npm --prefix Pokemon/app run build

# 查看 rulesets
gh api repos/IgniteCollections/Codex-Themes/rulesets

# 查看 release
gh release list -R IgniteCollections/Codex-Themes
```
