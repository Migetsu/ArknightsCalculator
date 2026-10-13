import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  type TranslationBatchItem,
  importBatches,
} from './translate-missing'
import { validateTranslation } from './validate-translation'

/**
 * Standard translated names dictionary for skills, talents, and modules.
 */
const TRANSLATIONS_DICT: Record<string, string> = {
  // Batch 1: Skill names
  "新月的苏醒": "Crescent Awakening",
  "满月的舞会": "Full Moon Soiree",
  "残月的余响": "Echo of the Waning Moon",
  "多首野兽": "Multi-Headed Beast",
  "破坏与滋养": "Destruction and Nourishment",
  "我思念的": "That Which I Miss",
  "我悲悯的": "That Which I Pity",
  "如焰般热烈": "Passionate as Flame",
  "如麦般生长": "Growing like Wheat",
  "颤栗之弦": "Trembling String",
  "无存之所": "Nowhere Place",
  "绝境抵抗": "Desperate Resistance",
  "生存决心": "Will to Survive",
  "数据分析": "Data Analysis",
  "循理归因": "Rational Attribution",
  "谐波破坏": "Harmonic Disruption",
  "静域回声": "Echo of the Silent Domain",
  "火钳秘咒": "Fire Tongs Incantation",
  "“捉迷藏！”": "\"Hide and Seek!\"",

  // Batch 1: Talent names
  "颂乐音符": "Ode Notes",
  "毋畏遗忘": "Fearless of Oblivion",
  "另一个“她”": "Another \"Her\"",
  "毋畏死亡": "Fearless of Death",
  "谎言的假面": "Mask of Lies",
  "毋畏悲伤": "Fearless of Sorrow",
  "双利手": "Ambidextrous",
  "毋畏爱意": "Fearless of Love",
  "应召而至": "Arriving upon Call",
  "毋畏恐惧": "Fearless of Fear",
  "简易包扎": "Simple Bandage",
  "疾笔撰录": "Swift Pen Recording",
  "反暗影特殊压制兵装": "Anti-Shadow Special Suppression Weapon",
  "背弃沉默": "Forsaking Silence",
  "久病良医": "Physician Through Protracted Illness",

  // Batch 1: Module names
  "“稍后回来”": "\"Be Back Later\"",
  "宠物大赛第一名": "First Place in the Pet Contest",
  "想要留下的生命": "The Life Wanting to Stay",
  "“心”": "\"Heart\"",
  "冰原的影子": "Shadow of the Tundra",
  "提丰特限证章": "Typhon's Specialized Badge",
  "好时节": "Favorable Season",
  "余证章": "Yu's Badge",
  "人间百味": "Flavors of the World",
  "秩序圣“球”": "Holy \"Orb\" of Order",
  "灵知特限证章": "Gnosis's Specialized Badge",
  "毒医残章": "Remnants of the Toxic Doctor",
  "音乐家的旅程": "The Musician's Journey",
  "坚雷证章": "Durnar's Badge",
  "守护的道路": "Path of Protection",
  "旅游必需品": "Travel Essentials",
  "梦想终将实现": "Dreams Will Come True",
  "“独属自己的一隅”": "\"A Corner of One's Own\"",
  "石棉证章": "Asbestos's Badge",
  "“石棉大战双头钳兽”": "\"Asbestos vs. Two-Headed Pincher\"",
  "艾丽妮特限证章": "Irene's Specialized Badge",
  "玫瑰色故事集": "Rose-Colored Story Collection",
  "暮落证章": "Shalem's Badge",
  "票根收纳册": "Ticket Stub Album",
  "剑舞": "Sword Dance",
  "霍尔海雅特限证章": "Ho'olheyak's Specialized Badge",

  // Batch 2: Module names
  "车尔尼证章": "Czerny's Badge",
  "“日复一日”": "\"Day After Day\"",
  "佩佩特限证章": "Pepe's Specialized Badge",
  "明椒证章": "Paprika's Badge",
  "“多彩人生”": "\"Colorful Life\"",
  "温米证章": "Warmy's Badge",
  "赠别之味": "Flavor of Farewell",
  "欲雪时": "When Snow Approaches",
  "笔迹": "Handwriting",
  "“最后一行”": "\"The Final Line\"",
  "跃跃证章": "Caper's Badge",
  "新生代": "New Generation",
  "暖意的归宿": "Haven of Warmth",
  "新合同": "New Contract",
  "证明什么？": "Prove What?",
  "娜仁图亚证章": "Narantuya's Badge",
  "“吹尽狂沙”": "\"Blowing Away the Sand\"",
  "归溟幽灵鲨特限证章": "Specter the Unchained's Specialized Badge",
  "“致我们的老大”": "\"To Our Boss\"",
  "莎草证章": "Papyrus's Badge",
  "小小的种子": "Tiny Seed",
  "“前路”": "\"The Road Ahead\"",
  "妮芙证章": "Nymph's Badge",
  "心声": "Voice of the Heart",
  "烦恼问诊匣": "Box of Troubled Consultation",
  "菲莱证章": "Philae's Badge",
  "被摩挲的日子": "Days Gently Rubbed",
  "好锯多磨": "A Good Saw Requires Polishing",
  "水灯心证章": "Brigid's Badge",
  "风的颜色": "Color of the Wind",
  "Mon3tr证章": "Mon3tr's Badge",
  "记忆存档": "Memory Archive",
  "百炼嘉维尔特限证章": "Gavial the Invincible's Specialized Badge",
  "无言的约定": "Silent Promise",
  "“新车和新生活”": "\"New Car and New Life\"",
  "睦的新朋友": "Mutsumi's New Friend",
  "罗德岛制式双刀": "Rhodes Island Standard Dual Blades",
  "占卜的意义": "Meaning of Divination",
  "已知悉": "Acknowledged",
  "年轻的麦子": "Young Wheat",
  "琳琅诗怀雅特限证章": "Swire the Elegant Wit's Specialized Badge",
  "额外训练": "Extra Training",
  "“老朋友”": "\"Old Friend\"",
  "未曾风化": "Unweathered",
  "Miss.Christine证章": "Miss.Christine's Badge",
  "“黑色”贩卖机": "\"Black\" Vending Machine",
  "烛煌证章": "Blaze the Pyrolight's Badge",
  "热切的期盼": "Eager Expectation",
  "假期的最后一天": "Last Day of the Holiday",
  "沟通小助手": "Communication Assistant",
  "“时间的痕迹”": "\"Traces of Time\"",
  "缺角的权限": "Clipped Clearance",
  "昨日、今日、明日": "Yesterday, Today, Tomorrow",
  "“睡前故事”": "\"Bedtime Story\"",
  "异客特限证章": "Passenger's Specialized Badge",
  "折光证章": "Diamante's Badge",
  "凡石": "Ordinary Stone",

  // Batch 2: Skill descriptions
  "立刻<$ba.liftoff>起飞</>，攻击力<@ba.vup>+{atk:0%}</>，获得<@ba.vup>{damage_resistance:0%}</>的<$ba.airprotect>对空庇护</>，攻击范围<@ba.vup>扩大</>，且周围8格视作予愿安洁莉娜的额外攻击范围，攻击对<@ba.vup>{attack@max_walk_target}</>个敌人造成攻击力<@ba.vup>{attack@atk_scale:0%}</>的物理伤害且额外攻击1个飞行敌人；范围内飞行敌人移动速度<@ba.vup>{move_speed:0%}</>，<@ba.vup>原技能范围</>内有未被阻挡的可阻挡飞行敌人，且自身未阻挡时，<$ba.addash>移动</>至该敌人所在格\n<@ba.rem>攻击装有{attack@trigger_time}发弹药，打完后技能结束（期间可随时停止技能）</>":
    "Immediately <$ba.liftoff>Takes Off</>, ATK <@ba.vup>+{atk:0%}</>, gains <@ba.vup>{damage_resistance:0%}</> <$ba.airprotect>Aerial Sanctuary</>, attack range <@ba.vup>expands</>, and the surrounding 8 tiles are treated as Angelina the Mellow Wish's additional attack range. Attacks deal <@ba.vup>{attack@atk_scale:0%}</> ATK as Physical damage to <@ba.vup>{attack@max_walk_target}</> enemies and additionally attack 1 aerial enemy; aerial enemies within range have Movement Speed <@ba.vup>{move_speed:0%}</>. When unblocked and an unblocked blockable aerial enemy enters the <@ba.vup>original skill range</>, <$ba.addash>Moves</> to that enemy's tile\n<@ba.rem>Loaded with {attack@trigger_time} rounds of ammunition; skill ends when all rounds are spent (can be manually cancelled at any time)</>",

  "发射4支攻击力<@ba.vup>{atk_scale_1:0%}</>的箭矢\n<@ba.rem>可充能1次，充能至最大层数时自动释放一次</>":
    "Fires 4 arrows each dealing <@ba.vup>{atk_scale_1:0%}</> ATK as damage\n<@ba.rem>Can store 1 charge; automatically triggered when reaching maximum charges</>",

  "发射4支攻击力<@ba.vup>{atk_scale_1:0%}</>的箭矢，若还有充能则额外消耗1层施展<@ba.vup>刚连射</>：发射5支攻击力<@ba.vup>{atk_scale_2:0%}</>的箭矢，每支箭矢有<@ba.vup>{stun_prob:0%}</>概率使目标<$ba.stun>晕眩</><@ba.vup>{stun}</>秒\n<@ba.rem>可充能2次，充能至最大层数时自动释放一次</>":
    "Fires 4 arrows each dealing <@ba.vup>{atk_scale_1:0%}</> ATK as damage. If charges remain, consumes 1 additional charge to perform <@ba.vup>Power Volley</>: fires 5 arrows each dealing <@ba.vup>{atk_scale_2:0%}</> ATK as damage, with each arrow having a <@ba.vup>{stun_prob:0%}</> chance to <$ba.stun>Stun</> the target for <@ba.vup>{stun}</> seconds\n<@ba.rem>Can store 2 charges; automatically triggered when reaching maximum charges</>"
}

async function run() {
  const inDir = path.resolve(process.cwd(), '.cache/translate/in')
  const outDir = path.resolve(process.cwd(), '.cache/translate/out')
  await fs.mkdir(outDir, { recursive: true })

  const inFiles = (await fs.readdir(inDir)).filter(f => f.startsWith('batch_001') || f.startsWith('batch_002'))

  let validatedOk = 0
  let validatedFail = 0

  for (const file of inFiles) {
    const raw = await fs.readFile(path.join(inDir, file), 'utf-8')
    const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0)
    const outItems: TranslationBatchItem[] = []

    for (const line of lines) {
      const item = JSON.parse(line) as TranslationBatchItem
      const translated = TRANSLATIONS_DICT[item.zh]
      if (translated) {
        const val = validateTranslation(item.zh, translated, { checkNewlines: true })
        if (val.valid) {
          validatedOk++
          item.en = translated
        } else {
          validatedFail++
          console.error(`Validation failed for item ${item.id} (${item.zh}):`, val.issues)
        }
      }
      outItems.push(item)
    }

    const outPath = path.join(outDir, file)
    await fs.writeFile(outPath, outItems.map(i => JSON.stringify(i)).join('\n') + '\n', 'utf-8')
    console.log(`Wrote ${outItems.filter(i => i.en).length} translations to ${file}`)
  }

  console.log(`Validation summary: ${validatedOk} OK, ${validatedFail} failed`)
  const importResult = await importBatches()
  console.log('Import result:', importResult)
}

run().catch(console.error)
