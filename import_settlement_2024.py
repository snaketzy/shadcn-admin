import xlrd
import pymysql
from datetime import datetime

XLS_PATH = '/Users/jerry/Documents/Repositories/shadcn-admin/assets/database_structure/经营表-20241231.xls'
SHEET_INDEX = 0

DB_CONFIG = {
    'host': '101.43.54.73',
    'port': 3306,
    'database': 'jiehong',
    'user': 'jiehong',
    'password': 'snaketzy123$',
    'charset': 'utf8mb4'
}

HEADER_ROW = 0  # 第1行(0-based)

COLUMN_MAPPING = {
    'case_invoice_number': '发票号',
    'case_order_amount': '订单金额',
    'case_owner_custom_packing_transport_fee': '报关,包装,运费（船东）',
    'case_invoice_amount': '发票金额',
    'case_bank_fee': '银行手续费',
    'case_actual_amount': '实际到账',
    'case_pay_to_supplier': '应付供应商',
    'case_supplier_custom_packing_transport_fee': '报关,包装,运费（供应商）',
    'case_payment_fee': '付款手续费',
    'case_payment_date': '支付日期',
    'case_deadline_for_owner': '船东应付款时间',
    'case_receipt_date': '到账日期',
    'case_settlement_remark': '备注',
}

DATETIME_FIELDS = {'case_payment_date', 'case_deadline_for_owner', 'case_receipt_date'}

def parse_cell_datetime(val, ct, datemode):
    if val is None or (isinstance(val, str) and val.strip() == ''):
        return None
    if ct == xlrd.XL_CELL_DATE:
        try:
            y, m, d, hh, mm, ss = xlrd.xldate_as_tuple(val, datemode)
            return datetime(y, m, d, hh, mm, ss)
        except:
            pass
    if isinstance(val, (int, float)):
        s = str(int(val))
        if len(s) == 8:
            try:
                return datetime.strptime(s, '%Y%m%d')
            except:
                pass
        try:
            y, m, d, hh, mm, ss = xlrd.xldate_as_tuple(val, datemode)
            return datetime(y, m, d, hh, mm, ss)
        except:
            pass
    if isinstance(val, str):
        s = val.strip()
        if not s:
            return None
        fmts = ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%Y/%m/%d', '%Y%m%d']
        for f in fmts:
            try:
                return datetime.strptime(s, f)
            except:
                continue
    return None

def parse_numeric_value(val):
    if val is None:
        return None
    if isinstance(val, (int, float)):
        s = str(val)
        if len(s) > 11:
            return s[:11]
        return s
    if isinstance(val, str):
        s = val.strip()
        if not s:
            return None
        if s.startswith('#') or s in ('#REF!', '#VALUE!', '#DIV/0!', '#N/A', '#NAME?'):
            return None
        s = s.replace(',', '')
        try:
            float(s)
            if len(s) > 11:
                return s[:11]
            return s
        except:
            return None
    return None

def parse_string_value(val, max_len=11):
    if val is None:
        return None
    if isinstance(val, (int, float)):
        s = str(val)
        if len(s) > max_len:
            return s[:max_len]
        return s
    if isinstance(val, str):
        s = val.strip()
        if not s:
            return None
        if len(s) > max_len:
            return s[:max_len]
        return s
    return None

def main():
    wb = xlrd.open_workbook(XLS_PATH)
    ws = wb.sheet_by_index(SHEET_INDEX)
    datemode = wb.datemode
    sheet_name = wb.sheet_names()[SHEET_INDEX]
    print(f'工作表: {sheet_name} (总行数={ws.nrows}, 总列数={ws.ncols})')

    header_idx = {}
    for c in range(ws.ncols):
        raw = ws.cell_value(HEADER_ROW, c)
        if raw is None:
            continue
        h = str(raw).strip()
        if h:
            header_idx[h] = c
    print(f'表头识别: {header_idx}\n')

    rows_data = []
    skipped_empty = 0
    for r in range(HEADER_ROW + 1, ws.nrows):
        row_dict = {}
        has_data = False
        for db_field, excel_h in COLUMN_MAPPING.items():
            col_i = header_idx.get(excel_h)
            if col_i is None:
                row_dict[db_field] = None
                continue
            cell_v = ws.cell_value(r, col_i)
            cell_ct = ws.cell_type(r, col_i)

            if db_field in DATETIME_FIELDS:
                row_dict[db_field] = parse_cell_datetime(cell_v, cell_ct, datemode)
            elif db_field == 'case_settlement_remark':
                row_dict[db_field] = parse_string_value(cell_v, 500)
            elif db_field == 'case_invoice_number':
                row_dict[db_field] = parse_string_value(cell_v, 100)
            else:
                row_dict[db_field] = parse_numeric_value(cell_v)

            if row_dict[db_field] is not None and str(row_dict[db_field]).strip() != '':
                has_data = True

        if not has_data:
            skipped_empty += 1
            continue
        row_dict['case_id'] = None
        row_dict['case_exchange_rate'] = None
        rows_data.append(row_dict)

    print(f'数据行数(不含表头): {ws.nrows - HEADER_ROW - 1}')
    print(f'有效数据行数: {len(rows_data)}')
    print(f'跳过空行数: {skipped_empty}\n')

    if not rows_data:
        print('无有效数据，终止')
        return

    fields = list(COLUMN_MAPPING.keys()) + ['case_id', 'case_exchange_rate']
    field_list = ', '.join(fields)
    placeholders = ', '.join(['%s'] * len(fields))
    sql = f"INSERT INTO case_settlement_list ({field_list}) VALUES ({placeholders})"

    connection = None
    try:
        connection = pymysql.connect(**DB_CONFIG)
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM case_settlement_list")
            before = cursor.fetchone()[0]
            print(f'导入前 case_settlement_list 行数: {before}')

            values_list = [tuple(r[f] for f in fields) for r in rows_data]
            cursor.executemany(sql, values_list)
            connection.commit()

            cursor.execute("SELECT COUNT(*) FROM case_settlement_list")
            after = cursor.fetchone()[0]
            inserted = after - before
            print(f'导入后行数: {after}')
            print(f'成功插入: {inserted}\n')

            cursor.execute(f"SELECT {field_list} FROM case_settlement_list ORDER BY case_settlement_id DESC LIMIT 3")
            samples = cursor.fetchall()
            print('=== 最后 3 条样例 ===')
            for s in samples:
                disp = {}
                for i, f in enumerate(fields):
                    v = s[i]
                    if v is not None and f in DATETIME_FIELDS:
                        v = v.strftime('%Y-%m-%d')
                    disp[f] = v
                print(disp)

    except Exception as e:
        print(f'失败: {e}')
        import traceback; traceback.print_exc()
        if connection: connection.rollback()
    finally:
        if connection: connection.close()

if __name__ == '__main__':
    main()
