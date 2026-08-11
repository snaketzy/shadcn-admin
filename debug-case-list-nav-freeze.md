# Debug Session: case-list-nav-freeze
- **Status**: [OPEN]
- **Issue**: 访问 /case_list 后，若不打开「添加案件」Dialog 直接点左侧导航其他模块 → 页面无响应；若先打开+关闭 Dialog，再点导航则正常
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-case-list-nav-freeze.ndjson

## Reproduction Steps
1. 打开 http://localhost:5173/case_list（刷新页面，确保是冷启动状态）
2. **不要**点击「添加案件」/「编辑」按钮，即 CasesActionDialog 从未 open
3. 点击左侧导航栏的其他模块（如 Dashboard / Suppliers / Vessels）
4. 预期：路由跳转成功
5. 实际：页面无响应 / 冻结

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| H1 | CasesActionDialog 未 open 时仍挂载且内部 useQuery 的 queryKey 依赖项引用不稳定（对象/数组/函数每次 render 都是新引用），导致 TanStack Query 无限 refetch 触发重渲染死循环 | High | Low | Pending |
| H2 | useEffect 中 `form.reset(defaultValues)` 缺少 open/currentRow 守卫，当 Dialog 未 open 但已挂载时，空/undefined currentRow 导致 reset 无限反复触发（RHF → 重渲染 → deps 又变 → reset） | High | Low | Pending |
| H3 | 新接入的 fetchSupplierAll（supplierRows）与 caseGroupsData 之间存在 query 循环：caseGroupsData onSuccess 触发 supplier 查询 enabled 变化 → supplier 返回又触发 select 中 state 变化 → 重渲染 → caseGroupsData queryKey 变化 | Medium | Low | Pending |
| H4 | useTableUrlState 或 URL 解析状态与 CasesActionDialog 内部 state 双向绑定，Dialog 未 open 时 state 未初始化导致 URL ↔ state 乒乓循环 | Low | Med | Pending |
| H5 | 某个未加 enabled 守卫的 useQuery 在 Dialog 未 open 时发出请求，请求失败/重试 onError 中 setState → setState 触发重渲染 → 又触发请求 | Medium | Low | Pending |

## Log Evidence
[待收集]

## Verification Conclusion
[待执行]
