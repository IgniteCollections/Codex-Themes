# CI / Release 流水线 — 需求文档

日期： 2026-07-18

## 背景

本仓库（Codex-Themes）用于开发 Codex 主题集合。每个主题是一个目录（如 `Pokemon/`），其中 `Pokemon/app/` 是一个 Vite + React + TypeScript 应用，提供 `lint` 和 `build` 脚本。当前仓库没有任何 CI、分支保护或发布流程，代码直接提交在 `main` 上。

## 问题与范围

需要建立一套标准的开发与发布流程：

1. `main` 是受保护的生产分支，禁止直接推送。
2. `pre-release` 是集成分支，同样受保护，所有开发合并到这里。
3. 每个开发任务从最新的 `pre-release` 创建独立任务分支，完成后通过 PR 合回 `pre-release`。
4. 合入 `pre-release` 的 PR 必须通过基本检查（theme 应用的 lint + build）。
5. 从 `pre-release` 合并到 `main`（发布晋升 PR）也必须通过同样的检查。
6. 代码进入 `main` 后，自动创建基于当前日期时间的版本 release。

## 领域假设

- 主题应用约定位于 `<Theme>/app/`，含 `package.json` 及 `lint`、`build` npm 脚本（参见 `Pokemon/app/package.json`）。
- 新增主题只要遵循同样目录约定，即自动纳入检查，无需修改工作流。
- 未来可能出现不含 `app/` 的纯主题目录，检查必须能跳过而不失败。
- 版本号采用日期时间格式 `vYYYY.MM.DD-HHMM`（UTC），同一分钟内多次发布自动追加序号（`-2`、`-3`）保证唯一。

## 验收标准

- [ ] `main` 和 `pre-release` 均有分支保护（ruleset）：禁止 force push、禁止删除、必须通过 PR 合入。
- [ ] 两个分支的 PR 都要求 `CI Gate` 状态检查通过。
- [ ] CI 对每个 `*/app/` 主题应用执行 `npm ci`、`npm run lint`、`npm run build`。
- [ ] 仓库中没有任何主题应用时，CI 仍然通过。
- [ ] 合并到 `main` 后自动创建 GitHub Release，tag 为日期时间格式，release notes 自动生成。
- [ ] 全流程通过一次真实的首发验证：任务分支 → PR → pre-release → PR → main → release。
