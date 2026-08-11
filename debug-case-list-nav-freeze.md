# [OPEN] Case List 导航冻结调试

## 症状描述
- 进入 `http://localhost:5175/case_list` 页面
- 点击左侧导航栏跳转至其它模块
- 页面冻结（JS 主线程卡死，无法响应交互）

## 复现步骤
1. 访问 /case_list 页面
2. 等待页面加载完成（可操作）
3. 点击左侧导航任意外部模块（如 Dashboard / Invoice / Vessel / Owner / Contact）
4. 预期：正常跳转；实际：页面冻结

## 可证伪假设

| 编号 | 假设 | 预测 | 观测点 |
|------|------|------|--------|
| H1 | cases-action-dialog 中存在 re-render infinite loop（useCallback/useMemo 依赖循环或引用不稳定导致链级重渲染） | 进入 /case_list 后，不做任何操作，CasesActionDialog 每秒 re-render 次数 > 60 | CasesActionDialog render 计数器 + 时间戳 |
| H2 | 新增 2 个 useQuery（owner-picker-groups / contact-picker-groups）在 open=false 时仍触发 select / observer 风暴，或与已有 query 产生竞态，使 TanStack Query 重试/重建 | 导航触发后 observer.onUnsubscribe 数量异常或出现大量 query cancel error | 每个 useQuery 的 onSuccess/onError/onSettled 计数 |
| H3 | 6 个新增 keyMap useMemo + 6 个 resolveXxxDisplay useCallback 依赖链形成「父 useMemo 新引用 → 子 useCallback 重建 → 下游 display useMemo 重执行 → 新 JSX 返回 → 父重渲染」循环 | 每次 render 期间 ownerTeamKeyMap / resolveOwnerDisplay / ownerDisplay 三个对象的引用均变化，且循环次数 > 100 | 上述三者的 `===` 比较日志 |
| H4 | 路由卸载 cleanup 期间，某个 pending 的 Promise.then 回调在卸载后调用 setState，触发 StrictMode 双调用或 React Router 阻塞取消 | 导航点击后，1s 内出现 > 100 次 "Can't perform a React state update on an unmounted component" 或连续 useEffect cleanup | 组件 mount/unmount 日志 + setState 计数 |
| H5 | `resolveDictLabel` 未用 useCallback 导致在 JSX 层被 inline 调用时触发某个 Badge 组件异常更新（但此函数目前未在 render inline 调用，仅在 useCallback 内使用） | 暂不优先验证 | - |

## 验证矩阵
- 第一步：静态插桩（仅加日志，不改业务逻辑）→ 用户复现
- 第二步：根据日志确认假设 → 最小修复
- 第三步：插桩日志 + 修复 → 对比 pre vs post

## 日志位置
- 调试 Session ID: `case-list-nav-freeze`
- Log 文件: `trae-debug-log-case-list-nav-freeze.ndjson`
