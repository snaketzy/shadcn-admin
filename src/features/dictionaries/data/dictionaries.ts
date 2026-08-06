import { faker } from '@faker-js/faker'
import { dictionaryGroups, type DictionaryGroup } from './schema'

faker.seed(12345)

const dictionaryKeyValueMap: Record<DictionaryGroup, Array<[string, string]>> = {
  '业务类型': [
    ['FOB', '离岸价'],
    ['CIF', '到岸价'],
    ['CFR', '成本加运费'],
    ['EXW', '工厂交货'],
    ['FCA', '货交承运人'],
    ['CPT', '运费付至'],
    ['CIP', '运费保险费付至'],
    ['DAP', '目的地交货'],
    ['DPU', '卸货地交货'],
    ['DDP', '完税后交货'],
  ],
  '船舶状态': [
    ['AVAILABLE', '可用'],
    ['CHARTERED', '已租'],
    ['UNDER_MAINTENANCE', '维修中'],
    ['LOADING', '装货中'],
    ['DISCHARGING', '卸货中'],
    ['SAILING', '航行中'],
    ['WAITING', '待泊'],
    ['DEMURRAGE', '滞期'],
  ],
  '港口列表': [
    ['SHA', '上海港'],
    ['NGB', '宁波港'],
    ['SZN', '深圳港'],
    ['QIN', '青岛港'],
    ['TJN', '天津港'],
    ['HKG', '香港港'],
    ['SIN', '新加坡港'],
    ['KHH', '高雄港'],
    ['OSA', '大阪港'],
    ['TYO', '东京港'],
    ['BUS', '釜山港'],
    ['HKG', '香港港'],
  ],
  '货物类型': [
    ['GENERAL', '杂货'],
    ['BULK', '散货'],
    ['CONTAINER', '集装箱'],
    ['REEFER', '冷藏货'],
    ['DANGEROUS', '危险品'],
    ['LIQUID', '液体货'],
    ['LIVESTOCK', '牲畜'],
    ['VEHICLE', '车辆'],
    ['PROJECT', '大件货物'],
  ],
  '结算方式': [
    ['T/T', '电汇'],
    ['L/C', '信用证'],
    ['D/P', '付款交单'],
    ['D/A', '承兑交单'],
    ['O/A', '赊销'],
    ['CASH', '现金'],
    ['CHECK', '支票'],
    ['COD', '货到付款'],
  ],
  '货币单位': [
    ['CNY', '人民币'],
    ['USD', '美元'],
    ['EUR', '欧元'],
    ['JPY', '日元'],
    ['GBP', '英镑'],
    ['HKD', '港币'],
    ['SGD', '新加坡元'],
    ['KRW', '韩元'],
  ],
  '运输条款': [
    ['LINER', '班轮条款'],
    ['FIO', '船东不装不卸'],
    ['FI', '船东不装但卸'],
    ['FO', '船东装但不卸'],
    ['FIOST', '船东不装不卸平舱理舱'],
    ['FILO', '船东不装但负责卸'],
    ['LIFO', '船东装但不负责卸'],
  ],
  '包装方式': [
    ['BAG', '袋装'],
    ['BOX', '箱装'],
    ['DRUM', '桶装'],
    ['PALLET', '托盘'],
    ['CONTAINER', '集装箱'],
    ['BUNDLE', '捆扎'],
    ['LOOSE', '散装'],
    ['ROLL', '卷装'],
    ['CRATE', '板条箱'],
    ['BALE', '包'],
  ],
}

export const dictionaries = Array.from({ length: 120 }, (_, i) => {
  const group = dictionaryGroups[i % dictionaryGroups.length]
  const kvList = dictionaryKeyValueMap[group]
  const kv = kvList[i % kvList.length]
  return {
    id: faker.string.uuid(),
    group,
    key: kv[0],
    value: kv[1],
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  }
})
