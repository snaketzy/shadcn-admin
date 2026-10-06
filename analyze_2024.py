import pymysql

DB_CONFIG = {
    'host': '101.43.54.73',
    'port': 3306,
    'database': 'jiehong',
    'user': 'jiehong',
    'password': 'snaketzy123$',
    'charset': 'utf8mb4'
}

def sf(v):
    if v is None: return 0.0
    try:
        s = str(v).strip()
        if not s: return 0.0
        return float(s)
    except:
        return 0.0

def fmt(n):
    return f'{n:,.2f}'

def calc(rows, title):
    actual = order = invoice = owner_fee = 0.0
    bank = supp = supp_fee = pay_fee = 0.0
    for r in rows:
        actual    += sf(r[0])
        invoice   += sf(r[1])
        order     += sf(r[2])
        bank      += sf(r[3])
        supp      += sf(r[4])
        supp_fee  += sf(r[5])
        pay_fee   += sf(r[6])
        owner_fee += sf(r[7])
    cost = supp + supp_fee + bank + pay_fee
    gross = actual - supp
    net = actual - cost
    print(f'\n━━━ {title}（{len(rows)}条）━━━')
    print(f'  【收入端】')
    print(f'    订单金额合计:         {fmt(order)}')
    print(f'    发票金额合计:         {fmt(invoice)}')
    print(f'    实际到账合计:         {fmt(actual)}')
    print(f'    船东报关/包装/运费:   {fmt(owner_fee)}')
    print(f'  【成本/费用端】')
    print(f'    应付供应商合计:       {fmt(supp)}')
    print(f'    供应商报关/包装/运费: {fmt(supp_fee)}')
    print(f'    银行手续费合计:       {fmt(bank)}')
    print(f'    付款手续费合计:       {fmt(pay_fee)}')
    print(f'    成本费用总计:         {fmt(cost)}')
    print(f'  【毛利 / 纯收入】')
    print(f'    毛利 (到账-应付供应商):                 {fmt(gross)}')
    print(f'    纯收入 (到账-全部成本费用):              {fmt(net)}')
    return net

connection = pymysql.connect(**DB_CONFIG)
try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM case_settlement_list")
        print(f'表总记录数: {cursor.fetchone()[0]}\n')

        cursor.execute("""
            SELECT YEAR(case_receipt_date), COUNT(*)
            FROM case_settlement_list WHERE case_receipt_date IS NOT NULL
            GROUP BY YEAR(case_receipt_date) ORDER BY 1
        """)
        print('到账日期分布:')
        for r in cursor.fetchall():
            print(f'  {r[0]}年: {r[1]} 条')

        cursor.execute("""
            SELECT YEAR(case_deadline_for_owner), COUNT(*)
            FROM case_settlement_list WHERE case_deadline_for_owner IS NOT NULL
            GROUP BY YEAR(case_deadline_for_owner) ORDER BY 1
        """)
        print('\n船东应付款时间分布:')
        for r in cursor.fetchall():
            print(f'  {r[0]}年: {r[1]} 条')

        cols = 'case_actual_amount, case_invoice_amount, case_order_amount, case_bank_fee, case_pay_to_supplier, case_supplier_custom_packing_transport_fee, case_payment_fee, case_owner_custom_packing_transport_fee'

        cursor.execute(f"SELECT {cols} FROM case_settlement_list WHERE YEAR(case_receipt_date) = 2024")
        calc(cursor.fetchall(), '口径A：按【到账日期】归属 2024 年（实际已到账）')

        cursor.execute(f"SELECT {cols} FROM case_settlement_list WHERE YEAR(case_deadline_for_owner) = 2024")
        calc(cursor.fetchall(), '口径B：按【船东应付款时间】归属 2024 年（权责发生）')

        cursor.execute(f"SELECT {cols} FROM case_settlement_list WHERE case_invoice_number LIKE 'JHS24-%'")
        calc(cursor.fetchall(), '口径C：【发票号 JHS24- 开头】的全部记录（含未到账）')

finally:
    connection.close()
