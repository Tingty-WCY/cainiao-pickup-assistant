# 快递取件码统一管理 App

本地优先的快递取件码统一管理工具（移动端 Expo / React Native）。把多个手机号、多个电商平台、多个驿站的快递统一归档，打开 App 即可看到：**有多少待取、在哪个驿站、取件码是多少**。

- 本地优先：默认存本机 SQLite，不上传服务器
- 多账号：一个用户可绑定多个手机号 + 多平台（淘宝 / 京东 / 拼多多 / 抖音 / 其他）
- 多驿站：菜鸟 / 兔喜 / 丰巢 / 京东驿站 / 其他，按驿站查看待取
- 隐私：手机号与单号默认脱敏，设置可开启「显示敏感信息」
- 可扩展：文本解析引擎 + `DataSourceAdapter` 预留第三方平台接入（严守不破解、不绕过验证码红线）

---

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Expo (React Native) + TypeScript (strict) |
| 数据库 | `expo-sqlite`（设备本地 SQLite，零服务端、零上传） |
| ORM | Drizzle ORM（`drizzle-orm` 类型 + 参数化 SQL） |
| 文本解析 | 自研 Parser 引擎（纯函数，置信度分级） |
| 状态 | React Context（`AppContext` + 4 个 hooks） |
| 导航 | `expo-router`（Tab 5 页 + 3 个 modal） |
| 测试 | vitest（核心逻辑，纯 Node 即可跑） |

> 说明：核心逻辑层（types / schema / parser / dedupe / services）与 UI 解耦，且被一组 `DbClient` 抽象统一。测试用 `MemoryDbClient`，App 运行用 `ExpoDbClient`（expo-sqlite），Service 与 UI 代码零改动即可切换。

---

## 目录结构

```
app/                           expo-router 页面
  _layout.tsx                  AppProvider + Stack（tabs + 3 modal）
  (tabs)/
    _layout.tsx                底部 Tab：首页/快递/账号/驿站/设置
    index.tsx                  首页：待取统计 + 按驿站分组 + 复制/标记已取
    packages.tsx               快递：搜索 + 状态/驿站筛选
    accounts.tsx               账号：多账号 CRUD + 启用禁用
    stations.tsx               驿站：驿站 CRUD + 查看快递
    settings.tsx               设置：敏感信息开关 + 导出/导入(JSON)
  add.tsx                      手动添加快递（modal）
  edit.tsx                     编辑快递（modal）
  import.tsx                   粘贴物流文字 → 解析 → 置信度 UI → 入库（modal）
src/
  types/index.ts               领域类型与枚举（strict，无 any）
  utils.ts                     ID / 时间 / 手机号校验 / 脱敏 / 格式化
  db/
    types.ts                   DbClient 接口（数据访问抽象）
    schema.ts                  Drizzle ORM schema（expo-sqlite）
    migrations.ts              可重复执行迁移 SQL
    memoryClient.ts            内存版 DbClient（测试）
    expoClient.ts              expo-sqlite 版 DbClient（App 运行）
    index.ts                   DbClient 工厂（返回 ExpoDbClient）
    queryCore.ts               筛选/排序/聚合/去重 纯函数（两端共用）
    seed.ts                    默认用户常量
    demoData.ts                一键载入演示数据（本机验证用，幂等）
  parser/{rules,engine}.ts     文本解析引擎（取件码/驿站/公司/手机号识别）
  services/accountMatch.ts     粘贴后自动归属账号（手机号 > 脱敏 > 平台 > 未分类兜底）
  services/stationMatch.ts     解析出的驿站名匹配已有驿站（未命中则自动建档）
  dedupe/index.ts              应用层去重 + 历史写入
  services/                    Account/Station/Package/Dashboard/Parser 服务
  state/                       AppContext + usePackages/useAccounts/useStations/useDashboard
  ui/                          theme / PackageCard / MaskedText / StatusBadge /
                               FormField / FormModal / ActionSheet / ConfirmDialog /
                               LoadingState / EmptyState / labels / PackageForm
  adapters/index.ts            DataSourceAdapter + Manual/TextParser + 平台 stub
tests/                        vitest 用例（parser/dedupe/account/package）
```

---

## 运行（本机验证）

> 核心逻辑（解析/去重/服务/演示数据）已可在 Node 下用 `npm test` 跑通；**UI 必须在本机用模拟器或真机验证**——沙箱里没有模拟器。

### 0. 环境前置
| 组件 | 说明 |
|---|---|
| Node.js | 建议 LTS（v18 / v20） |
| Expo CLI | `npm install -g expo-cli` 或始终用 `npx expo` |
| Android 模拟器 | Android Studio 安装并新建一个 AVD（推荐 Pixel 系列） |
| iOS 模拟器 | 仅 macOS：装 Xcode + 命令行工具 |
| 真机（最省事） | 手机装 **Expo Go**（Android / iOS 均可），扫码即开 |

> `expo-sqlite` 是 Expo 内置原生模块，在 **Expo Go** 中可直接使用，无需先打 dev build。若后续接入自定义原生模块，再改用 `npx expo prebuild` / EAS dev build。

### 1. 安装依赖
```bash
cd <项目目录>
npm install
```

### 2. 启动
```bash
npm start            # = npx expo start，终端出现二维码
```
- **真机**：用 Expo Go 扫码打开。
- **Android 模拟器**：另开终端 `npm run android`（会先 `npx expo start` 再装到模拟器）。
- **iOS 模拟器（macOS）**：`npm run ios`。

### 3. 首次打开后建议
1. 进入 **设置 → 载入演示数据（首次验证用）**：一键写入 4 个多平台账号、4 个驿站、7 条覆盖各状态的快递，首页/快递/账号/驿站立刻有内容可看。
2. 逐页走查（详见 `QA验证清单.md`）：复制取件码、标记已取、搜索筛选、手动/粘贴添加、导出/导入。

### 4. 核心逻辑测试 / 类型检查（无需模拟器）
```bash
npm test                 # vitest，45 个用例全绿
npm run typecheck       # 核心层 tsc --noEmit（strict）
npm run typecheck:app   # Expo 层 tsc -p tsconfig.app.json（strict）
```

### 5. 构建（EAS Build，发布用）
```bash
npx eas build --platform android   # 需先 `npx eas login` 并配置 eas.json
```

### 常见问题
- **Metro 卡住 / 白屏**：`npx expo start -c` 清缓存重启。
- **Android 模拟器连不上**：确认 AVD 已启动；或改用真机 Expo Go 扫码。
- **`expo-sqlite` 报错**：确认 `app.json` 已加 `expo-sqlite` 插件（本项目已配置），且 Expo SDK 版本一致（~52）。
- **类型检查不过**：先 `npm run typecheck`（核心层），再 `npm run typecheck:app`（Expo 层），按报错定位。

---

## 数据模型

- **User** → **Account**（1:N）：一个用户多个账号（手机号 + 平台）
- **Account** → **Package**（1:N）
- **Station** → **Package**（1:N，删除驿站时 `station_id SET NULL`）
- **Package** → **PickupCodeHistory**（1:N）：取件码变更可追溯（如 528→839）

状态（`PackageStatus`）：`PENDING_PICKUP`(待取) / `SHIPPING`(运输中) / `PICKED_UP`(已取) / `EXCEPTION`(异常) / `UNKNOWN`(兜底)。MVP 不启用 `ARRIVED`。

---

## 快速添加（两种方式）

1. **手动输入**：账号 / 快递公司 / 单号 / 取件码 / 驿站 / 状态 / 备注。
2. **粘贴物流文字**：如「您的中通快递已到达XX菜鸟驿站，取件码528，请及时领取。」→ 自动识别公司/取件码/驿站/状态并给出置信度（高≥90% / 中≥70% / 低<70%，低置信度提示手动核对）→ 确认入库。

提交前均经过**应用层去重**：`tracking_number + account` → `手机号 + 公司 + 取件码 + 驿站` → 新建；同一快递只保留一条，取件码变更写入历史。

---

## 关键设计

1. **DbClient 抽象**：Service 与 UI 不感知底层数据库。测试用内存实现；App 用 expo-sqlite 实现，Service/UI 一行不动。
2. **queryCore 纯函数**：筛选/排序/聚合/去重逻辑被 `MemoryDbClient` 与 `ExpoDbClient` 共用，保证两套实现行为完全一致。
3. **Parser 独立引擎**：`parseText(text) → ParsedPackage`，后续 OCR 只需把图片识别结果转文本再调用同一引擎。
   - 取件码四重回退：别名正则（取件码/提货码/验证码…）→ 「请凭513-2-4004」「凭「75962434」」→ 「凭 1234 取件」→ 货架码 `8-2-3056` / `513-2-4004`。
   - 驿站名：优先「到 X 取件 / 到店 X 领取」结构，再用关键词 + 清洗（剥掉「您的订单已送达」这类前缀）。
   - **快递尾号**（`tailNumber`）：识别「尾号5624 / 快递*9499 / 快递0901」，卡片上与取件码紧挨显示——不少驿站出库要求两者一起出示。
   - **柜号/格口**（`boxNo`）：外卖柜、智能柜要先找格子。识别「格口号：15」「柜号A12」并与柜体拼接成 `B-15`；短信开头的【发件方】标签会被剥掉，不会把「【美团智能外卖柜】」误当成驿站名。
   - 公司推断：正文关键词 → 单号前缀（SF→顺丰、JD→京东…）；认不出不强猜；「菜鸟驿站」不会被误当成快递公司。
4. **添加零负担**：账号自动归属（完整手机号 > 脱敏手机号 > 平台 > 「未分类」兜底账号，兜底账号自动创建），驿站库里没有时自动建档，快递公司留空自动填「未知」——粘贴一条短信只需核对取件码即可保存。
5. **去重与历史**：多来源同快递只留一条；取件码变更写入 `pickup_code_history`。
6. **隐私优先**：手机号/单号默认脱敏展示；不保存电商密码；不上传数据。

---

## 测试覆盖

- **parser（28）**：各快递公司、仅取件码、仅公司、运输中、低置信度、兔喜驿站；真实电商短信（菜鸟/京东/丰巢/拼多多/抖音/淘宝）含平台识别、扩展驿站词（代收点等）；**取件码别名（提货码/取货码/验证码/凭码）、无「码」字的货架码（8-2-3056）、脱敏手机号、单号前缀推断公司、驿站名清洗、快递尾号**；**校园驿站真实样本 6 条**（京东 G5-16-008 / 极兔 513-2-4004 / 近邻宝「75962434」/ 邮政 7-9448 / 顺丰 SF7-3780 / 美团外卖柜 格口15+取件码6165）
- **dedupe（4）**：优先级 1/2/3、跨账号不误判
- **account（4）**：创建 / 非法手机号 / 空昵称 / 启用禁用 / 删除
- **package（6）**：CRUD、标记已取、修改取件码写历史、重复合并、首页聚合、关键字搜索
- **demoData（3）**：首次载入数量、重复调用幂等、摘要聚合正确
- **accountMatch（7）**：手机号命中、脱敏手机号命中、平台命中、禁用账号不选中、未分类兜底、标记待新建、脱敏比对规则

> 共 52 个用例，纯 Node 运行，无需模拟器。

---

## 已知问题 / 限制

- **无法自动读取其他 App / 短信里的取件码**（平台限制，不是本项目偷懒）：
  - **iOS**：完全不可行。系统沙盒下第三方 App 读不到其他 App 内容、短信，也没有通知读取权限。
  - **Android**：只能读**通知栏**（需 `NotificationListenerService`，Expo Go 不支持自定义原生模块，必须做 dev build），且**应用内页面**（如菜鸟 App 里的取件码页）依然读不到；用无障碍服务抓取属灰色地带，本项目不做（红线：不破解、不绕过验证码）。
  - 因此当前路线是**复制短信 → 粘贴自动解析**，零权限、零上传。
- **驿站出库的「身份码」无法获取**：菜鸟/京东/顺丰/邮政等 App 的身份码是**实时刷新的二维码**（每次打开都变，且与账号登录态绑定），存储在对方服务器，第三方 App 无法读取、无法复现、也不应尝试。本 App 的定位是**把短信里已有的取件码 + 尾号 + 格口聚合展示**，出库时仍需打开对应 App 出示身份码。
- 沙箱无 Rust / 模拟器，移动端 UI 需在本机 `npx expo start` 用真机或模拟器验证；核心逻辑已在本机 Node 下单测通过。
- `expo-sqlite` 数据库文件导出较复杂，当前「导出/导入」采用 **JSON 备份/恢复** 方案（不影响数据完整性）。
- `ARRIVED` 状态 MVP 暂不启用。
- 第三方平台（淘宝/京东/拼多多/抖音/SMS）Adapter 仅声明接口，未实现自动同步（严守红线：不破解、不绕过验证码、不窃取 Cookie、不收集电商密码、不上传数据）。

---

## 下一步

- **本机验证（当前重点）**：`npx expo start` 后用模拟器/真机逐页走查，按 `QA验证清单.md` 勾选验收。
- OCR 识别截图（预留 `OCR` DataSource + 解析引擎）
- 剪贴板监听自动识别（预留 `CLIPBOARD` DataSource）
- 通知提醒（取件到期/到站）
- 第三方平台数据同步研究（Adapter 实现，需合法稳定的数据获取方式）
