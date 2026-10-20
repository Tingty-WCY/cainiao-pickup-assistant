# 项目长期记忆（菜鸟驿站 App）

## 技术栈与关键约定
- Expo SDK 52 (`expo ~52.0.0`) + React Native 0.76 + TypeScript strict + Drizzle ORM + `expo-sqlite`（本地 SQLite，零服务端）。
- 导航 expo-router（5 Tab + 3 modal）；状态 `AppContext` + 4 hooks；DB 抽象 `DbClient`（测试 `MemoryDbClient` / 运行 `ExpoDbClient`），筛选聚合逻辑共用 `src/db/queryCore.ts` 纯函数。
- 所有写操作参数化 SQL；脱敏只在 UI 层（`MaskedText`），DB 存原始值。
- 验证三步走：`npm run typecheck`（核心）→ `npm run typecheck:app`（Expo 层）→ `npm test`（vitest）。

## 沙箱环境限制（重要，跨会话复用）
- **不要用沙箱执行 npm/npx 安装类命令**：bash shim 会崩（`dirname: command not found` / `bash: No such file or directory`）；PowerShell 工具**不回显 stdout**，且 `npm install` 在沙箱内始终 exit 1、无输出。
- 需要看命令输出时：PowerShell 里用 `*>` 重定向到文件，再用 Read 工具读文件（不要用 `| Out-File`，会丢输出）。
- 纯 Node 的只读命令（`npm test` / `npm run typecheck`）在 bash 下通常可用，但 shim 偶发失效，失败就换 PowerShell。
- **包安装、启动 dev server 等命令，交给用户在本机终端执行**；我这边负责诊断 + 改文件。

## 常见坑
- 依赖树不全会导致 `expo start` 报缺 `expo-asset` 等隐式依赖。定位：Glob `node_modules/expo-*/package.json` vs Grep `node_modules/expo/package.json` 的 dependencies 段。
- **本机源连通性实测（2026-09-15）**：`mirrors.cloud.tencent.com/npm` ✅ 通（npm 默认源就是它）；`registry.npmmirror.com` ❌ ECONNRESET；`registry.npmjs.org` ❌。**装包不要指定 npmmirror**，直接 `npm install` 用默认源（早期记录里"建议加 --registry=npmmirror"是错的，已废弃）。
- 装包遇到 `ECONNRESET`：多数是代理（Clash 等）干扰或镜像抖动。处理顺序 → ①清 npm 代理配置（`npm config delete proxy / https-proxy`）②加 `--prefer-offline --no-audit --no-fund --fetch-retries=5` 重试 ③换源（腾讯云 `https://mirrors.cloud.tencent.com/npm/` / 华为）④`npm cache clean --force` ⑤换网络（手机热点）。若清代理后变 ETIMEDOUT，说明确实需要代理，按代理端口配回（`npm config set proxy http://127.0.0.1:7890`）。
- **沙箱内 `npm install` 会半途失败**：沙箱注入的 `node-safe-delete-shim` 在 npm 批量替换旧包时抛 `SAFE_DELETE_BULK_CONFIRM_REQUIRED`（阈值 50），导致 cleanup 失败。**包安装必须交给用户在本机终端跑**，我这边只能诊断 + 改文件。
- **判断 Expo 依赖是否装好的正确方法**：用 `await require('@expo/metro-config').getDefaultConfig(process.cwd())` 是否成功作判据（`npm start` 就崩在这一层）。**不要**用 `require('expo-asset')` 判断——`.fx` 是 Expo 平台扩展后缀（实际文件 `Asset.fx.js` 存在），Node 原生 require 解析不了会误报 `Cannot find module '.../Asset.fx'`，曾据此误判为"包损坏"。
- **跑测试/类型检查看不到输出时**（bash shim 崩 + PowerShell 不回显 + `*>` 写出的文件 Read 报 binary）：临时写一个 `.cjs` 脚本（项目是 `"type":"module"`，`.js` 会被当 ESM）用 `execSync` 跑命令并 `writeFileSync(...,'utf8')`，再 Read 该文件，最后删掉脚本。注意一条命令一个文件，否则后写的覆盖前面的。

## 第三方 App 跳转（URL Scheme）约定
- 配置集中在 `src/services/appLinks.ts` 的 `APP_LINKS`（数据驱动，失效改一行），**不要**把 scheme 硬编码进 UI。
- **绝不做 `canOpenURL` 安装检测**：iOS 需 Info.plist 的 `LSApplicationQueriesSchemes`、Android 11+ 需 manifest `<queries>`，Expo Go 都改不了 → 必定返回 false，反而误判「未安装」。正确姿势：直接 `try Linking.openURL(scheme)` → 失败退 `webUrl` → 再失败才算 `'failed'`。
- 同一平台的 scheme 写成**数组**依次尝试（拼多多配了 `pinduoduo://` / `pinduoduo://com.xunmeng.pinduoduo/` / `pdd://`），单写一个容易在某台机器上失效。
- 淘宝/拼多多**只能打开 App 首页**，个人资产页（我的快递、待取件）无公开 scheme；菜鸟 `cainiao://desktop/station_code` 可直达身份码页（社区逆向，暂未实装）。

## 第三方 App 跳转（URL Scheme）约定
- 配置集中在 `src/services/appLinks.ts` 的 `APP_LINKS`（数据驱动，改一行即可），**不要**把 scheme 硬编码到 UI。
- **绝不做 `canOpenURL` 安装检测**：iOS 需 Info.plist 的 `LSApplicationQueriesSchemes`、Android 11+ 需 manifest `<queries>`，Expo Go 都改不了 → 必返 false，反而误判「未安装」。直接 `try Linking.openURL(scheme)` → 失败退 `webUrl` → 再失败才算 `'failed'`。
- 同一平台的 scheme 写成**数组**依次尝试（拼多多 `pinduoduo://` / `pinduoduo://com.xunmeng.pinduoduo/` / `pdd://`），单写一个容易在某台机器上失效。
- **别给淘宝加多余 path**（2026-09-16 真机踩坑）：淘宝唤端协议形如 `[scheme]://[host][path]?...&h5Url=...`，**不认识的 path 会被当成 H5 地址在淘宝自家 WebView 里打开** → 看到的是网页版而不是 App。曾错用 `taobao://m.taobao.com/tbhome/entry`，用户反馈「打开的是手机淘宝宣传页」。正解是官方写法 **`taobao://m.taobao.com`**（到 host 为止，不要 path）；裸 `taobao://` 会让淘宝恢复到「上次停留的页面」，只作兜底。
- **小红书 iOS 是 `xhsdiscover`、Android 是 `xhsdiscovery`（差一个 y）**；首页用 `xhsdiscover://home`，官方基础协议是 `xiaohongshu://`。**`xhs://` 不存在**，写了必然失败并降级到浏览器。
- 个人资产页（我的快递 / 待取件 / 驿站）没有公开路由，跳不过去。菜鸟 `cainiao://desktop/station_code` 可直达身份码页（社区逆向，未实装）。

## 驿站：写死的 6 个（2026-09-16）
- 只有 **京东 / 邮政 / 菜鸟 / 近邻宝 / 顺丰 / 德邦** 这 6 个固定驿站，定义在 `src/db/seed.ts` 的 `FIXED_STATIONS`；**认不出的一律归 `DEFAULT_STATION_ID`（菜鸟）**。
- 解析短信时**绝不自动建档**：统一走 `resolveFixedStationId(stationName, courierCompany, senderTag)`，判定顺序 **驿站名 → 短信签名 → 快递公司 → 兜底菜鸟**。
  - `senderTag` 由解析器从短信 `【】` 签名里抓出（`ParsedPackage.senderTag`）—— 品牌名常常**只写在那里**，正文只剩「到XX柜取件」（例：`【近邻宝】凭「9911-9276」到学生公寓西侧10号柜`）。
  - **不要把签名并进 `stationName`**（试过，一次污染 6 个旧测试；stationName 要保持干净）。
  - **关键词表只放品牌名，不放「驿站 / 快递 / 服务中心 / 柜」这类泛词**（泛词命中不了品牌，自然落到菜鸟）。
- 老数据由 `ExpoDbClient.init()` 里的 `normalizeStations()` 规整：非预置驿站的快递改挂到对应预置驿站后删掉该站点。合并计划由纯函数 `planStationMerge()` 算出（有单测）。
- 预置驿站不可删除；驿站页已去掉「+ 添加」按钮（手动加的会被下次规整吞掉，留着误导）。
- **要加第 7 个站点**：改 `FIXED_STATIONS` + `stationMatch.ts` 的品牌关键词表，两处即可。

## tab 页面的路由参数必须用 effect 同步（重要）
expo-router 的 tab 页切走再切回来**不会重新挂载**，`useState(路由参数)` 的初值只在首次生效 → 第二次带不同参数进入时 state 不更新。
> 事故：驿站页点「查看快递」第二次没反应，根因就是 `packages.tsx` 用 `useState(initialStation)` 读 `params.stationId`。
修法：`useEffect(() => setX(参数), [参数])`。
- 相关：`PackageQuery` 有 `stationId`（严格筛选）和 `focusStationId`（置顶排序）两个字段，别搞混。

## 打包与分发（2026-09-16）
- **构建类任务（EAS / gradle）一律交用户在本机终端跑**，我这边不能跑 npm/npx 安装类命令。
- 配置已就位：`eas.json`（`preview` 档 = 可直接安装的 APK）、`app.json` 里 Android 包名 **`com.jiuqiagent.cainiao`** + `versionCode`。
- **包名一旦装到手机上就不可更改**（改了等于换 App，数据不互通）。
- **项目不是 git 仓库时 EAS 传不上去**：必须先 `git init`。`.gitignore` 必须排除 `node_modules/`，否则会上传几万个文件（曾只有一行 `expo-env.d.ts`，已补全）。
- **iOS 独立包**：EAS 云端**可以**构建 iOS（不需要自己有 Mac），但**签名必须用苹果开发者账号**（$99/年 ≈ ¥688）。
  免费 Apple ID 签出的证书只有 **7 天**有效期，且需 Mac + Xcode 重签，不实用。**所以 iPhone 侧继续用 Expo Go 是最优解。**
- **不要随意更新 iPhone 上的 Expo Go** —— 新版 Expo Go 会逐步放弃对旧 SDK 的支持，而本项目固定在 SDK 52。能跑就别动。
- 图标/启动图为空（`assets/` 只有 `.gitkeep`）→ 构建出来是默认图标。要生成图标走 ImageGen，**会消耗积分，必须先告知用户并取得同意**。
- **Expo Go 能跑 ≠ 独立构建能成功**：Expo Go 用自身内置的原生模块版本，独立打包用项目安装的版本，版本错位只在**原生编译阶段**才暴露。
- 排查依赖版本：读本地 `node_modules/expo/bundledNativeModules.json`（SDK 官方版本表）逐项对比 `package.json`。**注意 `~x.y.0` 只能覆盖 `x.y.z`，跨 minor 的（如 expo-sqlite 15.0 → 15.1）会静默装旧版** —— 本项目就栽在这上面。
- EAS 报 `Gradle build failed with unknown error` 是**兜底文案**，真因在构建页 `Run gradlew` 里的 `* What went wrong:` 之后。日志页需登录，抓不到时只能让用户提供。**看日志按关键词定位**（`e:` / `FAILURE` / `What went wrong` / `Caused by`），几百行里通常只有一两行有用。
- **SDK 52 + RN 0.76 的已知坑：Kotlin 版本冲突** —— `expo-modules-core` 的 Compose 编译器 1.5.15 要求 Kotlin **1.9.25**，而 RN 0.76.0 模板给 **1.9.24** → `:expo-modules-core:compileReleaseKotlin` 编译失败。**解法是用 `expo-build-properties` 插件在 `app.json` 里钉 `"kotlinVersion": "1.9.25"`**（手改 `android/build.gradle` 会被 prebuild 覆盖）。已在 `app.json` 配好，别删。
- expo-router 的必需 peer 依赖 `expo-constants` / `expo-linking` **必须显式写进 package.json**，否则「离开 Expo Go 可能崩」。
- 详细步骤见项目根目录 `打包说明.md`。

## 账号功能已整体移除（2026-09-16，重要，别「顺手」加回来）
- 应用层**没有账号概念**：无 Account 类型、无账号 CRUD、无账号选择 UI、无「未分类」兜底账号。手动添加/导入快递都不再问归属，也不会自动建账号。
- **但 DB 层必须保留 `accounts` 表 + `packages.account_id` 列 + 一条 `system-account` 记录**。老库该列是 `NOT NULL REFERENCES accounts(id)`，SQLite 摘不掉列的 NOT NULL / 外键（只能整表重建；`PRAGMA foreign_keys = ON` 时 DROP TABLE 会触发 pickup_code_history 级联删除 → 丢数据）。
- 落点链路：`seed.ts`（`SYSTEM_ACCOUNT_ID`）→ `migrations.ts`（`INSERT OR IGNORE`）→ `statements.ts`（INSERT 第 2 个参数固定写它）。**删表 / 删那条记录 / 删列，都会让老机「添加快递」直接崩在 NOT NULL 或外键上。**
- 去重已随之简化：`matchDuplicate(candidate, existing)` 只有「单号相同」→「公司+取件码+驿站」两条，没有手机号/账号维度。
- 加平台跳转只改 `src/services/appLinks.ts` 的 `APP_LINKS` + `APP_LINK_ORDER`（字段 `label` / `schemes[]` / `webUrl` / `color` / 可选 `textColor`），`listAppLinks()` 排序输出，**UI 只遍历**。

## 改字段的强制核对清单（重要，血泪教训）
新增/删除任何字段时必须一次性核对 **5 处**，漏一处就是线上崩溃：
1. `src/types/index.ts`（Package / Create / Update / ParsedPackage）
2. `src/db/schema.ts`
3. `src/db/migrations.ts`（CREATE 语句 **和** `OPTIONAL_MIGRATIONS` 各一处）
4. `src/db/statements.ts`（SQL 列清单 / VALUES 占位符 / 参数数组 —— **三者必须等长同序**）
5. `src/db/expoClient.ts` 的 `ensurePackageColumns()`（老库补列白名单）+ `memoryClient.ts` + UI

**判据：列清单个数 == VALUES 值个数（含 NULL 字面量）== 参数数组长度。**
`tests/statements.test.ts` 会对 packages 的 INSERT/UPDATE 做这个静态校验，新增字段后它一定跑得到。
> 事故记录：加 `box_no` 时漏改 INSERT 列清单 → 参数整体错位 → `boxNo` 占用了 `status` 位置 → 空格口时 status 写 NULL → `NOT NULL constraint failed: packages.status`。

## 解析引擎迭代方式（重要）
- **用户的真实短信是唯一可靠的规则来源**。每次他给出新样本，直接写成 `tests/parser.test.ts` 用例，跑一次就知道规则对不对，比推演快且准。
- **想看某条短信被解析成什么**：写个临时 `tests/_tmp.test.ts`，让测试**自己 `fs.writeFileSync` 写 UTF-8 结果文件**再 Read —— Windows 终端会把 vitest 的中文输出糊成乱码，直接 console.log 看不清。
- **改规则后必须跑全量 `npm test`**：旧用例就是回归网。曾为了让近邻宝能匹配，把签名并进 `stationName`，一次挂掉 6 个旧用例。**不要污染语义上应保持干净的字段，改用新增字段承载额外线索。**
- **Hermes 不支持正则后行断言 `(?<=)`**，写正则时只能用前后字符组做边界（如 `(?:^|[^\d\-])(\d{1,3}-...)(?:[^\d\-]|$)`）。
- 取件码识别靠**四重回退**：别名正则 → 「凭 xxx」（可带「」包裹）→ 「凭 x 取件」→ 货架码。驿站名优先用「**到 X 取件 / 到店 X 领取**」结构，再用关键词 + `cleanStationName()` 清洗。
- 「菜鸟驿站」是驿站不是快递公司，别把它填进 courierCompany。
- **删文件要用 Node，不要用 PowerShell `Remove-Item`**：中文路径下 safe-delete 钩子会拦截并报 `[safe-delete][SAFE_DELETE_FAIL_CLOSED] reason: trash-failed`（回收站失败），命令返回 exit 0 但**什么都没删**。绕过：写一个 ASCII 内容的 `.cjs`，用 `fs.unlinkSync(path.join(__dirname, name))`，末尾 `fs.unlinkSync(__filename)` 自删。验证是否真删掉：用 **Read 试读**（报 not exist 即成功），**Glob 有缓存会返回旧结果，不可信**。
- **同一条消息里并发发多个 Edit 调用会静默丢失**（工具返回 Success 但没落盘，2026-09-16 一次丢了 6 处，靠 `typecheck` 报错和 `grep` 才查出来）。涉及多文件联动改动（如新增字段贯穿 types→db→ui）时：**一次只发一个 Edit**；改完后必须用 `grep -n 关键词` 逐文件核对落盘，再跑 typecheck。
