import pymysql

DB_CONFIG = {
    'host': '101.43.54.73',
    'port': 3306,
    'database': 'jiehong',
    'user': 'jiehong',
    'password': 'snaketzy123$',
    'charset': 'utf8mb4'
}

def safe_float(v):
    if v is None:
        return 0.0
    try:
        s = str(v).strip()
        if not s:
            return 0.0
        return float(s)
    except:
        return 0.0

def fmt(n):
    return f'{n:,.2f}'

def main():
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM case_settlement_list")
            total = cursor.fetchone()[0]
            print(f'表总记录数: {total}')

            cursor.execute("""
                SELECT 
                    COUNT(*) as cnt,
                    COUNT(case_receipt_date) as receipt_cnt,
                    COUNT(case_payment_date) as pay_cnt,
                    COUNT(case_deadline_for_owner) as deadline_cnt,
                    MIN(case_receipt_date) as min_receipt,
                    MAX(case_receipt_date) as max_receipt,
                    MIN(case_payment_date) as min_pay,
                    MAX(case_payment_date) as max_pay,
                    MIN(case_deadline_for_owner) as min_deadline,
                    MAX(case_deadline_for_owner) as max_deadline
                FROM case_settlement_list
            """)
            r = cursor.fetchone()
            print(f'\n=== 日期分布 ===')
            print(f'有到账日期的: {r[1]} 条  ({r[4]} ~ {r[5]})')
            print(f'有支付日期的: {r[2]} 条  ({r[6]} ~ {r[7]})')
            print(f'有船东应付时间的: {r[3]} 条  ({r[8]} ~ {r[9]})')

            cursor.execute("SELECT case_settlement_id, case_invoice_number, case_receipt_date, case_payment_date, case_deadline_for_owner, case_order_amount, case_owner_custom_packing_transport_fee, case_invoice_amount, case_bank_fee, case_actual_amount, case_pay_to_supplier, case_supplier_custom_packing_transport_fee, case_payment_fee FROM case_settlement_list LIMIT 8")
            sample = cursor.fetchall()
            cols = [d[0] for d in cursor.description]
            print(f'\n=== 前8条样例 ===')
            for s in sample:
                row = dict(zip(cols, s))
                print(f"ID={row['case_settlement_id']} 发票={row['case_invoice_number']} 到账={row['case_receipt_date']} 实际到账={row['case_actual_amount']} 应付供应商={row['case_pay_to_supplier']} 银行费={row['case_bank_fee']} 付款费={row['case_payment_fee']}")

            print('\n=== 按年份统计（使用到账日期case_receipt_date作为归属标准）===')
            cursor.execute("""
                SELECT 
                    YEAR(case_receipt_date) as yr,
                    COUNT(*)
                FROM case_settlement_list
                WHERE case_receipt_date IS NOT NULL
                GROUP BY yr
                ORDER BY yr
            """)
            for row in cursor.fetchall():
                print(f'  {row[0]}年: {row[1]} 条')

            print('\n=== 按年份统计（使用船东应付款时间case_deadline_for_owner作为归属标准）===')
            cursor.execute("""
                SELECT 
                    YEAR(case_deadline_for_owner) as yr,
                    COUNT(*)
                FROM case_settlement_list
                WHERE case_deadline_for_owner IS NOT NULL
                GROUP BY yr
                ORDER BY yr
            """)
            for row in cursor.fetchall():
                print(f'  {row[0]}年: {row[1]} 条')

            # 详细计算：2025年（使用到账日期和船东应付款时间两种口径）
            for yr_label, yr_cond in [
                ("case_receipt_date 归属2025年", "YEAR(case_receipt_date) = 2025"),
                ("case_deadline_for_owner 归属2025年", "YEAR(case_deadline_for_owner) = 2025"),
                ("全部记录（314条）", "1=1")
            ]:
                cursor.execute(f"""
                    SELECT 
                        case_actual_amount,
                        case_invoice_amount,
                        case_order_amount,
                        case_bank_fee,
                        case_pay_to_supplier,
                        case_supplier_custom_packing_transport_fee,
                        case_payment_fee,
                        case_owner_custom_packing_transport_fee
                    FROM case_settlement_list
                    WHERE {yr_cond}
                """)
                rows = cursor.fetchall()
                actual_sum = 0.0
                invoice_sum = 0.0
                order_sum = 0.0
                bank_fee_sum = 0.0
                pay_supplier_sum = 0.0
                supplier_fee_sum = 0.0
                payment_fee_sum = 0.0
                owner_fee_sum = 0.0

                for r in rows:
                    actual_sum += safe_float(r[0])
                    invoice_sum += safe_float(r[1])
                    order_sum += safe_float(r[2])
                    bank_fee_sum += safe_float(r[3])
                    pay_supplier_sum += safe_float(r[4])
                    supplier_fee_sum += safe_float(r[5])
                    payment_fee_sum += safe_float(r[6])
                    owner_fee_sum += safe_float(r[7])

                gross_profit = actual_sum - pay_supplier_sum
                net_income = actual_sum - pay_supplier_sum - bank_fee_sum - payment_fee_sum - supplier_fee_sum

                print(f'\n--- {yr_label} (共{len(rows)}条) ---')
                print(f'  【收入端】')
                print(f'    订单金额合计:        {fmt(order_sum)}')
                print(f'    发票金额合计:        {fmt(invoice_sum)}')
                print(f'    实际到账合计:        {fmt(actual_sum)}')
                print(f'    船东报关/包装/运费:  {fmt(owner_fee_sum)}')
                print(f'  【成本/费用端】')
                print(f'    应付供应商合计:      {fmt(pay_supplier_sum)}')
                print(f'    供应商报关/包装/运费:{fmt(supplier_fee_sum)}')
                print(f'    银行手续费合计:      {fmt(bank_fee_sum)}')
                print(f'    付款手续费合计:      {fmt(payment_fee_sum)}')
                print(f'    成本费用总计:        {fmt(pay_supplier_sum + supplier_fee_sum + bank_fee_sum + payment_fee_sum)}')
                print(f'  【毛利 / 纯收入】')
                print(f'    毛利 (实际到账-应付供应商):                {fmt(gross_profit)}')
                print(f'    纯收入 (扣除银行/付款/供应商杂费后):       {fmt(net_income)}')

    finally:
        connection.close()

if __name__ == '__main__':
    main()
