# Debug Session: case-list-nav-freeze
- **Status**: [OPEN]
- **Issue**: 访问 /case_list 页面时，点击左侧导航栏其他模块 → 页面 freeze，无法完成路由跳转。
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-case-list-nav-freeze.ndjson

## Reproduction Steps
1. 启动 Vite dev server on port 5173
2. 访问 http://localhost:5173/case_list ，等待页面完全渲染（含案件表格、筛选器等）
3. 点击左侧导航栏任意其他菜单项（如 /supplier_list、/contact_list、/owner_list 等）
4. 观察：页面是否 freeze（无响应、无路由跳转、白屏或卡死）

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| H1 (Infinite Loop) | CasesActionDialog 内部存在 useEffect + form.reset / state 更新导致的无限重渲染，阻塞主线程，使路由无法正常跳转 | High | Medium | Debug-point A render count 持续飙升 / interval deltaMs < 10 |
| H2 (Query Storm) | useQuery（supplierRows / 10 个 picker-all / case-inquiry-list 等）的 `enabled: open` 虽然已限制，但在路由卸载瞬间触发了大量未取消的请求/重试，导致并发或队列卡死 | Medium | Medium | Debug-point B network storm 相关事件 或 mount 间隔内 > 20 个 query |
| H3 (Unstable Deps) | useMemo / useCallback 依赖项中包含了在 render 时重新生成的对象/数组（如每次 render 新建的空数组 [] 作为 deps 的一部分），导致子组件无限 invalidate，卡住路由 | Medium | High | Debug-point C 各 memo/callback 重复初始化（非首次） |
| H4 (setState after unmount) | CasesActionDialog 的某个异步（useQuery onSuccess、setTimeout、navigator.sendBeacon fallback fetch 等）在组件卸载后仍然调用 setState，抛出 StrictMode 警告或陷入 React error boundary 内部循环，阻塞后续路由 commit | High | Low | Debug-point D unmount 之后仍有 setState / fetch 日志 |
| H5 (StrictMode double-invoke) | 调试插桩中的 setInterval / addEventListener 未在 StrictMode 下成对清理，造成两个 instance 的 setInterval 同时轮询 + 重复 sendBeacon/fetch 累积 CPU 100% | Medium | Low | Debug-point D unmount 前 mount count ≥ 2 / cleanup 执行次数 vs mount 次数不一致 |

## Log Evidence
(待 Step 3 复现后填充)

## Verification Conclusion
(待 Step 5 修复后填充 pre-fix vs post-fix 对比)
