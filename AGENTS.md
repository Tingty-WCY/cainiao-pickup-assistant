# AGENTS.md — 取件助手（菜鸟驿站）

> 给 AI 编码助手的项目说明书。**动手前先读完第 2 节「硬约束」**，这里记的都是踩过的坑，
> 违反其中任何一条都会导致线上崩溃或数据丢失。

## 1. 这是什么

本地优先的快递取件码统一管理 App。核心价值：打开就能看到「有多少待取、在哪个驿站、取件码多少、
在哪个柜子第几格」，不用挨个翻短信和 App。

- 技术栈：Expo SDK 52 + React Native 0.76 + TypeScript strict + expo-sqlite + Drizzle ORM
- **零服务端、零上传、零账号登录**，所有数据在本机 SQLite 里
- 用户是个人开发者（北京，研一），用 Android 真机 + Expo Go 验证
- EAS 打包配置已就绪（`eas.json` 的 `preview` 档产出可直接安装的 APK），但**尚未确认构建成功**：
  上一轮卡在 SDK 52 的 Kotlin 1.9.24 / 1.9.25 冲突，已用 `expo-build-properties` 修好并验证
  配置可解析。**接手时先跑一次 `eas build --platform android --profile preview` 冒烟**，
  失败就看构建页 `Run gradlew` 里 `* What went wrong:` 那一行（详见 `打包说明.md` 第九节）。

## 2. 硬约束（违反必炸）

### 2.1 账号功能已整体移除，但数据库结构必须保留

应用层**没有**账号概念：无账号 CRUD、无账号选择 UI、添加/导入快递不问归属。

但 DB 层**必须**保留 `accounts` 表和 `packages.account_id` 列，并保证有一条 `system-account` 记录：
老库该列是 `NOT NULL REFERENCES accounts(id)`，SQLite 摘不掉列的 NOT NULL / 外键（只能整表重建，
且 `PRAGMA foreign_keys = ON` 时 DROP TABLE 会级联删掉 `pickup_code_history`）。

链路：`src/db/seed.ts`（`SYSTEM_ACCOUNT_ID`）→ `migrations.ts`（`INSERT OR IGNORE`）
→ `statements.ts`（INSERT 第 2 个参数固定写它）。
**删表 / 删那条记录 / 删列 → 老机器「添加快递」直接崩在 NOT NULL 或外键上。**

### 2.2 改任何字段必须一次性核对 5 处

漏一处就是线上崩溃。新增/删除字段时逐项过：

1. `src/types/index.ts`（Package / CreatePackageInput / UpdatePackageInput / ParsedPackage）
2. `src/db/schema.ts`
3. `src/db/migrations.ts`（CREATE 语句 **和** `OPTIONAL_MIGRATIONS` 各一处）
4. `src/db/statements.ts`（SQL 列清单 / VALUES 占位符 / 参数数组）
5. `src/db/expoClient.ts` 的 `ensurePackageColumns()`（老库补列白名单）+ `memoryClient.ts` + UI

**判据：列清单个数 == VALUES 值个数（含 NULL 字面量）== 参数数组长度。**
`tests/statements.test.ts` 会对 packages 的 INSERT/UPDATE 做静态校验，改完一定跑得到。

> 真实事故：加 `box_no` 时漏改 INSERT 列清单 → 参数整体错位 → `boxNo` 占了 `status` 的位置
> → 空格口时 status 写 NULL → `NOT NULL constraint failed: packages.status`。

**改完用 `grep -n 字段名` 逐文件核对是否真的落盘**，别只看编辑工具返回成功。

### 2.3 Hermes 不支持正则后行断言

JS 引擎是 Hermes，**不能用 `(?<=)` / `(?<!)`**。写正则只能用前后字符组做边界，例如：
`/(?:^|[^\d\-])(\d{1,3}-\d{1,3}-\d{4})(?:[^\d\-]|$)/`

### 2.4 绝不检测 App 是否安装

**不要用 `Linking.canOpenURL` 判断第三方 App 装没装**：iOS 需要 Info.plist 的
`LSApplicationQueriesSchemes`、Android 11+ 需要 manifest `<queries>`，Expo Go 都改不了 →
必然返回 false，反而把「已安装」误判成「未安装」。

正确姿势：直接 `try Linking.openURL(scheme)` → 失败退 `webUrl` → 再失败才算 `'failed'`。

### 2.5 expo-router 的 tab 页路由参数必须用 effect 同步

tab 页切走再切回来**不会重新挂载**，`useState(params.x)` 的初值只在第一次生效。
必须写 `useEffect(() => setX(param), [param])`。

> 事故：驿站页点「查看快递」第二次没反应。

### 2.6 其它不许动的地方

- `app.json` 里 `expo-build-properties` 的 `"kotlinVersion": "1.9.25"` —— SDK 52 的必需补丁
  （`expo-modules-core` 的 Compose 编译器要求 1.9.25，RN 0.76 模板给的是 1.9.24），删了就编译失败。
- Android 包名 `com.jiuqiagent.cainiao` —— 已装到手机上，**改了等于换 App，数据不互通**。
- `expo-constants` / `expo-linking` 是 expo-router 的必需 peer 依赖，必须显式留在 package.json，
  否则离开 Expo Go 会崩。
- 解析规则改完**必须跑全量 `npm test`**，旧用例就是回归网。
  曾经为了匹配近邻宝把签名拼进 `stationName`，一次挂掉 6 个旧用例。
  **不要污染语义上应保持干净的字段，改用新增字段承载额外线索。**

## 3. 目录地图

```
app/                          expo-router 页面（TSX）
  _layout.tsx                 AppProvider + Stack
  (tabs)/_layout.tsx          底部 5 Tab
  (tabs)/index.tsx            首页：待取统计 + 按驿站分组
  (tabs)/packages.tsx         快递列表：搜索 + 状态/驿站筛选
  (tabs)/accounts.tsx         Tab 名叫「应用」，是第三方 App 跳转页。
                              ⚠️ 文件名是历史遗留（原本是账号管理），**不要因为看到 accounts 就删掉**
                              或「恢复」账号功能 —— 它现在是 APP_LINKS 的入口
  (tabs)/stations.tsx         驿站：6 个固定站点的快递
  (tabs)/settings.tsx         设置：敏感信息开关 + JSON 导出/导入
  add.tsx / edit.tsx          手动添加 / 编辑（modal）
  import.tsx                  粘贴短信 → 解析 → 置信度预览 → 入库（modal）
src/
  types/index.ts              领域类型与枚举（strict，无 any）
  utils.ts                    ID / 时间 / 校验 / 脱敏 / 格式化
  db/
    types.ts                  DbClient 接口（数据访问抽象，先看这个理解全貌）
    schema.ts                 Drizzle schema
    migrations.ts             可重复执行迁移 SQL + OPTIONAL_MIGRATIONS
    statements.ts             所有 SQL 语句（列清单/占位符/参数三者对齐）
    expoClient.ts             expo-sqlite 实现（含老库补列、驿站规整）
    memoryClient.ts           内存实现（测试用，行为必须与 expoClient 一致）
    queryCore.ts              筛选/排序/聚合/去重纯函数（两端共用，**改逻辑只改这里**）
    seed.ts                   默认用户 / system-account / 6 个固定驿站
  parser/rules.ts             所有正则与关键词表（改解析规则主要在这）
  parser/engine.ts            parseText(text) → ParsedPackage
  services/appLinks.ts        第三方 App 跳转配置（APP_LINKS，数据驱动）
  services/stationMatch.ts    resolveFixedStationId()：短信 → 6 个固定驿站之一
  dedupe/index.ts             matchDuplicate()：单号 / 公司+取件码+驿站
  services/ package.ts station.ts dashboard.ts
  state/                      AppContext + usePackages/useStations/useDashboard
  ui/                         theme / PackageCard / MaskedText / PackageForm / ...
  adapters/index.ts           DataSourceAdapter 接口 + 平台 stub（未实现，别假装实现）
tests/                        vitest，纯 Node 可跑，**唯一可靠的回归保障**
.workbuddy/memory/*.md        完整开发日志（按日期，含每次决策的来龙去脉）。
                              **未纳入 git**（.gitignore 排除了），只在本地存在。
                              遇到「为什么当初这么设计」的问题，去翻这里，答案通常在里面。
早期 Flutter 源码（lib/、pubspec.yaml、analysis_options.yaml）已清理，当前唯一维护项目为 Expo / React Native。
```

## 4. 命令

```bash
npm install                 # 依赖（锁文件已存在，用 npm ci 更快）
npm test                    # vitest 全量，当前全绿
npm run typecheck           # 核心层 tsc --noEmit（strict）
npm run typecheck:app       # Expo/UI 层 tsc -p tsconfig.app.json
npm start                   # = npx expo start，扫码用 Expo Go 打开
```

**验证三步走：`typecheck` → `typecheck:app` → `npm test`，三个都绿才算改完。**

> Windows 下 vitest 的中文输出经常糊成乱码。想看某条短信被解析成什么，
> 写个临时 `tests/_tmp.test.ts`，让测试自己用 `fs.writeFileSync(..., 'utf8')` 输出 JSON 文件，
> 再用编辑器打开，比 `console.log` 可靠。

## 5. 数据流

```
短信文本 → parseText() → ParsedPackage
                            ↓ resolveFixedStationId() 归到 6 个固定驿站之一
                            ↓ matchDuplicate() 去重
                            ↓ PackageService.create()
                        DbClient (expo-sqlite / memory)
                            ↓ queryCore 纯函数聚合
                        AppContext → UI
```

关键约定：
- **脱敏只在 UI 层**（`ui/MaskedText.tsx`），DB 里永远存原始值（否则搜不到、导不出）。
- 所有写操作参数化 SQL，**不拼字符串**。
- `queryCore.ts` 是两套 DbClient 共用的唯一筛选逻辑，别在客户端里各写一遍。

## 6. 解析引擎怎么改（最高频工作）

- `rules.ts` 放正则和关键词表，`engine.ts` 放判定顺序，改规则基本只动前两个。
- **取件码四重回退**：别名正则（取件码/提货码/提货码/验证码）→「凭 xxx」（可带「」包裹）
  →「凭 x 取件」→ 货架码 `8-2-3056`。
- 驿站名：优先「到 X 取件 / 到店 X 领取」结构，再关键词 + `cleanStationName()`。
- `senderTag`：从 `【】` 签名里抓品牌名。品牌常常**只写在签名里**（正文只剩「到XX柜取件」），
  所以驿站判定顺序是 **驿站名 → 签名 → 快递公司 → 兜底菜鸟**。签名**不要**并进 `stationName`。
- `boxNo`：`10号柜`、`柜号A12`、`签收L18` 都要能拼出 `10号柜 L18` 这种形式。
- `tailNumber`：快递尾号（「尾号5624」「快递*9499」），出库时常和取件码一起要。
- 「菜鸟驿站」是驿站不是快递公司，别填进 `courierCompany`。
- **用真实短信当测试用例**：用户每给一条新样本，直接加进 `tests/parser.test.ts`，
  跑一次就知道规则对不对。这是他验证过的最高效迭代方式。

## 7. 6 个固定驿站（不要再加自动建档）

`src/db/seed.ts` 的 `FIXED_STATIONS`：京东 / 邮政 / 菜鸟 / 近邻宝 / 顺丰 / 德邦。
**认不出的一律归 `station-cainiao`（兜底）**。解析短信时**绝不自动建驿站**
（历史上导致驿站表爆炸：同几个地方出现了十几种名字）。

加第 7 个站点 = 改 `FIXED_STATIONS` + `stationMatch.ts` 的关键词表，两处。
关键词表**只放品牌名**，不要放「驿站/快递/服务中心/柜」这类泛词（泛词命中不了品牌，只会误伤）。

老数据由 `expoClient.init()` 的 `normalizeStations()` 规整，合并计划由纯函数
`planStationMerge()` 计算（有单测，改之前看测试）。

## 8. 已知限制 —— 不要试图「解决」

- **读不到别的 App / 短信里的取件码**：iOS 系统层面不可能；Android 只能读通知栏，
  且需要自定义原生模块（Expo Go 不支持）。所以产品路线是「复制短信 → 粘贴解析」。
- **拿不到驿站身份码**：菜鸟/京东/顺丰的身份码是实时刷新、绑账号登录态的二维码，
  存在对方服务器。本 App 只聚合短信里已有的信息，出库仍需打开原 App。
- **淘宝/拼多多跳不了个人资产页**：没有公开 scheme，只能打开 App 首页。
  `taobao://m.taobao.com` 到 host 为止，**不要加 path**（不认识的 path 会被当成 H5 在淘宝内置
  WebView 里打开，用户看到的是网页版）。小红书 iOS 是 `xhsdiscover`、Android 是 `xhsdiscovery`。
- **红线**：不破解、不绕过验证码、不窃取 Cookie、不收集电商密码、不上传任何数据。
  如果需求只能靠这些手段实现，直接告诉用户做不到，不要写半成品钩子。

## 9. 下一步候选（按性价比）

1. **真机走查**：按 `QA验证清单.md` 逐项过，把 UI 上实际不顺的地方改掉（最高优先）。
2. **清理废弃代码**：已完成，早期 Flutter 源码与 Dart 配置已移除。注意 `app/(tabs)/accounts.tsx` **不是**残留，别删。
3. **首页体验**：待取数量大时按驿站折叠、常用驿站置顶、长按快捷操作。
4. **剪贴板监听**：`expo-clipboard` 已有，进前台时读一次剪贴板，命中短信特征就提示「发现取件码，要导入吗」。
5. **取件提醒**：本地通知（`expo-notifications`），到站/到期提醒。
6. **OCR 截图识别**：把图片识别结果转文本，直接复用 `parseText()`。
7. **图标与启动图**：`assets/` 还是空的，构建出来是默认图标。

## 10. 代码风格

- TypeScript strict，**不许 `any`**；不确定的类型用 `unknown` + 收窄。
- 中文注释，注释写「为什么」而不是「做了什么」。
- 纯逻辑（解析/去重/聚合）必须放纯函数里并配单测，不要塞进组件。
- 小步提交，commit message 用中文，一句话说清改了什么。
- 改 UI 前先看 `src/ui/theme.ts`，不要硬编码颜色和间距。
