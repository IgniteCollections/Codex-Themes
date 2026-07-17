# CI / Release 流水线 — 测试文档

日期： 2026-07-18

## TDD 说明

本任务的主体是 GitHub Actions 工作流与平台侧分支保护，无法在本仓库内用单测驱动。TDD 以"先定义验收检查，再让流水线真实跑通"的方式执行：下面的每个用例先定义期望结果，再通过真实的 PR / 合并 / API 调用验证。

## 测试用例

| # | 用例 | 期望 | 验证方式 |
|---|------|------|----------|
| 1 | 任务分支 PR 到 pre-release | `CI Gate` 出现并通过；发现 `Pokemon/app` 并 lint+build 成功 | PR checks 页面 / `gh pr checks` |
| 2 | 无主题应用时 CI | 发现步骤输出 `[]`，lint/build 步骤跳过，整体成功 | 工作流日志（本轮通过代码审查确认条件表达式，后续出现该形态仓库时真实验证） |
| 3 | 本地复现 CI 命令 | `npm ci` / `lint` / `build` 在 `Pokemon/app` 通过 | 本地执行（见下） |
| 4 | 分支保护生效 | `main`、`pre-release` 禁止直接 push 与 force push，PR 必需 `CI Gate` | `gh api repos/.../rulesets` 输出检查 |
| 5 | 发布晋升 PR（pre-release → main） | `CI Gate` 通过后合并 | `gh pr checks` |
| 6 | 合并到 main 触发发布 | `Release` 工作流成功，创建 `vYYYY.MM.DD-HHMM` tag 的 release，notes 非空 | `gh run list` / `gh release list` |
| 7 | 版本唯一性 | 同分钟再次发布会得到 `-2` 后缀 | 代码审查（循环查 `refs/tags`），需要时手动 `workflow_dispatch` 实测 |

## 回归覆盖

- 新增主题目录（`<NewTheme>/app/`）自动被 `git ls-files '*/app/package.json'` 发现，无需改工作流。
- 新增 CI job 时必须加入 `ci-gate.needs`，否则该 job 不影响合并门禁。
- ruleset 中必需检查名为 `CI Gate`，改名会立即阻塞所有 PR——CI 中 gate job 的 `name` 不可随意更改。

## 验证命令

```bash
# 用例 3：本地复现 CI
npm --prefix Pokemon/app ci
npm --prefix Pokemon/app run lint
npm --prefix Pokemon/app run build

# 用例 1/5：PR 检查
gh pr checks <PR号> -R IgniteCollections/Codex-Themes --watch

# 用例 4：分支保护
gh api repos/IgniteCollections/Codex-Themes/rulesets --jq '.[] | {name, enforcement}'

# 用例 6：发布结果
gh run list -R IgniteCollections/Codex-Themes --workflow=release.yml --limit 3
gh release list -R IgniteCollections/Codex-Themes --limit 3
```

## 阻塞与残余风险

- **本地阻塞（已记录）**：本机 `npm ci` 因网络/代理失败（`npm error network ... proxy`），`node_modules` 无法安装，导致本地 `lint`/`build` 无法执行（`eslint: command not found`、`tsc: command not found`）。已重试一次，结果相同。因此用例 3（本地复现 CI）无法在本地完成，改由 PR 上的真实 CI 运行（用例 1）作为权威验证——CI runner 网络环境独立，不受本机代理影响。
- 残余风险：`Pokemon/app` 依赖较多，`npm ci` 在 CI 上的耗时未经验证；首轮真实运行可确认。
