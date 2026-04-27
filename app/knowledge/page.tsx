'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = {
  green: '#7ecf5f',
  greenDark: '#5ba33d',
  greenLight: '#e8f5e0',
  yellow: '#f9d84d',
  yellowLight: '#fff9e0',
  red: '#e74c3c',
  redLight: '#fdecea',
  blue: '#5b9bd5',
  blueLight: '#e8f0fe',
  bg: '#fafff5',
  text: '#3d4a2e',
  textLight: '#6b7a55',
};

const IARC_LEVELS = [
  {
    level: '1类',
    title: '确定致癌物',
    description: '有明确证据表明对人类致癌。',
    examples: '加工肉类（培根、香肠）、烟草、酒精、槟榔。',
    color: COLORS.red,
    bgColor: COLORS.redLight,
    advice: '尽量避免摄入，健康风险极高。',
  },
  {
    level: '2A类',
    title: '很可能致癌物',
    description: '在动物实验中有明确证据，但在人类中证据有限。',
    examples: '红肉（猪牛羊肉）、高温油炸食品（丙烯酰胺）、65℃以上的热饮。',
    color: '#e67e22',
    bgColor: '#fdf2e9',
    advice: '建议限制摄入频率，注意烹饪方式。',
  },
  {
    level: '2B类',
    title: '可能致癌物',
    description: '在人类和动物实验中证据都不充分，但不能排除可能性。',
    examples: '阿斯巴甜（代糖）、腌制蔬菜、泡菜、手机辐射。',
    color: COLORS.yellow,
    bgColor: COLORS.yellowLight,
    advice: '在国标允许范围内使用通常是安全的，无需过度恐慌。',
  },
  {
    level: '3类',
    title: '尚不确定致癌',
    description: '缺乏足够的证据证明其对人类或动物致癌。',
    examples: '柠檬酸、咖啡因、茶、静电场。',
    color: COLORS.blue,
    bgColor: COLORS.blueLight,
    advice: '目前被认为是安全的成分。',
  },
];

const DIETARY_GUIDELINES = [
  {
    category: '谷薯类',
    icon: '🍚',
    amount: '250-400g',
    key: 'grain',
    description: '包括大米、小麦、玉米、土豆等。建议全谷物和杂豆占 50-150g，薯类 50-100g。',
    tips: '主食要粗细搭配，多吃全谷物。',
  },
  {
    category: '蔬菜类',
    icon: '🥦',
    amount: '300-500g',
    key: 'vegetable',
    description: '保证每天摄入不少于 300g 蔬菜，深色蔬菜应占 1/2。',
    tips: '餐餐有蔬菜，颜色越深营养通常越丰富。',
  },
  {
    category: '水果类',
    icon: '🍎',
    amount: '200-350g',
    key: 'fruit',
    description: '每天摄入 200-350g 新鲜水果。',
    tips: '果汁不能代替鲜果。',
  },
  {
    category: '畜禽肉蛋类',
    icon: '🥩',
    amount: '120-200g',
    key: 'meat_egg',
    description: '平均每天摄入 120-200g 畜禽肉、水产品和蛋类。',
    tips: '少吃加工肉制品，优先选择鱼类和禽类。',
  },
  {
    category: '奶类及奶制品',
    icon: '🥛',
    amount: '300-500g',
    key: 'dairy',
    description: '每天摄入 300-500g 奶类或相当量的奶制品。',
    tips: '相当于每天一袋/瓶牛奶。',
  },
  {
    category: '大豆及坚果类',
    icon: '🥜',
    amount: '25-35g',
    key: 'soy_nut',
    description: '每天摄入 25-35g 大豆及坚果。',
    tips: '大豆制品是优质蛋白的重要来源。',
  },
];

const ANTI_INFLAMMATORY_KNOWLEDGE = [
  {
    title: '促炎食物 (应减少摄入)',
    icon: '🔥',
    items: [
      { name: '超加工食品', desc: '含高量添加糖、精制碳水和反式脂肪（如甜点、薯片）。' },
      { name: '精制碳水', desc: '白米、白面等，会导致血糖快速升高，诱发炎症。' },
      { name: '红肉及加工肉类', desc: '如香肠、培根。富含饱和脂肪，过多摄入会刺激炎症。' },
      { name: '部分植物油', desc: '富含 Omega-6 的油类（如玉米油、大豆油）过量摄入。' },
    ]
  },
  {
    title: '抗炎食物 (建议多吃)',
    icon: '🛡️',
    items: [
      { name: '深海鱼类', desc: '富含 Omega-3 的三文鱼、鲭鱼。' },
      { name: '浆果类', desc: '蓝莓、草莓等富含花青素。' },
      { name: '十字花科蔬菜', desc: '西兰花、羽衣甘蓝，富含异硫氰酸盐。' },
      { name: '香辛料', desc: '姜黄（姜黄素）、生姜、大蒜。' },
      { name: '绿茶', desc: '富含茶多酚（EGCG）。' },
    ]
  },
  {
    title: '抗炎饮食原则',
    icon: '📜',
    items: [
      { name: '彩虹原则', desc: '每天摄入 5 种以上颜色的果蔬，获取不同抗氧化剂。' },
      { name: '全谷物替代', desc: '用糙米、燕麦、藜麦代替精制米面。' },
      { name: '优质油脂', desc: '优先选择橄榄油、牛油果、坚果。' },
    ]
  }
];

export default function KnowledgePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLevels = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return IARC_LEVELS;
    return IARC_LEVELS.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.examples.toLowerCase().includes(query) ||
      item.advice.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <main style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '1.5rem 2rem', fontFamily: 'system-ui, sans-serif', color: COLORS.text }}>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0.5rem 0' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', color: COLORS.greenDark, fontWeight: 700 }}>健康知识库</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/library')}
            style={{
              background: 'none', border: `1px solid ${COLORS.greenLight}`, borderRadius: '6px',
              padding: '0.4rem 1rem', fontSize: '0.9rem', color: COLORS.text, cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            食物库
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            style={{
              background: 'none', border: `1px solid ${COLORS.greenLight}`, borderRadius: '6px',
              padding: '0.4rem 1rem', fontSize: '0.9rem', color: COLORS.text, cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            首页
          </motion.button>
        </div>
      </motion.div>

      <section style={{ marginBottom: '3rem' }}>
        <motion.h2 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ fontSize: '1.2rem', borderLeft: `4px solid ${COLORS.green}`, paddingLeft: '0.75rem', marginBottom: '1.5rem' }}>
          IARC 致癌物分级详解
        </motion.h2>
        
        {/* 搜索框 */}
        <div style={{ marginBottom: '2rem', position: 'relative' }}>
          <input
            type="text"
            placeholder="搜索关键词（如：代糖、培根、辐射...）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.7rem 1rem',
              paddingLeft: '2.5rem',
              borderRadius: '10px',
              border: `1px solid ${COLORS.greenLight}`,
              fontSize: '0.9rem',
              outline: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              boxSizing: 'border-box'
            }}
          />
          <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: COLORS.textLight, cursor: 'pointer', fontSize: '1.1rem'
              }}
            >
              ×
            </button>
          )}
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ fontSize: '0.95rem', lineHeight: 1.6, color: COLORS.textLight, marginBottom: '1.5rem' }}>
          国际癌症研究机构（IARC）将物质的致癌风险分为四个主要等级。<strong style={{ color: COLORS.text }}>请注意：分级是基于“证据的确定性”，而不是“毒性的强弱”。</strong> 
          科学界公认的一条原则是：<strong style={{ color: COLORS.text }}>“脱离剂量谈毒性是不科学的。”</strong>
        </motion.p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AnimatePresence mode="popLayout">
            {filteredLevels.length > 0 ? (
              filteredLevels.map((item, idx) => (
                <motion.div 
                  key={item.level}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ scale: 1.01, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: item.bgColor,
                    border: `1px solid ${item.color}33`,
                    cursor: 'default',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{
                      background: item.color, color: '#fff', padding: '0.2rem 0.6rem',
                      borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600,
                    }}>{item.level}</span>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.title}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', margin: '0 0 0.5rem', color: COLORS.text }}>{item.description}</p>
                  <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem', color: COLORS.textLight }}>
                    <strong>常见例子：</strong> {item.examples}
                  </p>
                  <div style={{
                    marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.6)',
                    borderRadius: '6px', fontSize: '0.85rem', color: item.color, fontWeight: 500,
                  }}>
                    💡 专家建议：{item.advice}
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: 'center', color: COLORS.textLight, padding: '2rem' }}
              >
                未找到相关知识内容
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <motion.h2 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          style={{ fontSize: '1.2rem', borderLeft: `4px solid ${COLORS.green}`, paddingLeft: '0.75rem', marginBottom: '1.5rem' }}>
          《中国居民膳食指南 2022》推荐
        </motion.h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {DIETARY_GUIDELINES.map((item, idx) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              style={{
                padding: '1.25rem',
                borderRadius: '12px',
                background: '#fff',
                border: `1px solid ${COLORS.greenLight}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: COLORS.greenDark }}>{item.amount}</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{item.category}</h3>
              <p style={{ fontSize: '0.85rem', color: COLORS.text, margin: 0, lineHeight: 1.5 }}>{item.description}</p>
              <div style={{
                marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: COLORS.bg,
                borderRadius: '6px', fontSize: '0.8rem', color: COLORS.textLight,
                fontStyle: 'italic'
              }}>
                💡 {item.tips}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        style={{
          padding: '1.5rem',
          background: COLORS.bg,
          borderRadius: '12px',
          border: `1px solid ${COLORS.greenLight}`,
        }}>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: COLORS.greenDark }}>数据来源声明</h2>
        <ul style={{ fontSize: '0.9rem', lineHeight: 1.8, color: COLORS.textLight, margin: 0, paddingLeft: '1.2rem' }}>
          <li>
            <a href="https://monographs.iarc.who.int/agents-classified-by-the-iarc/" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.greenDark, fontWeight: 600, textDecoration: 'underline' }}>IARC Monographs</a>: 世界卫生组织下属国际癌症研究机构发布的致癌物分类报告。
          </li>
          <li>
            <a href="https://gb2760.cfsa.net.cn/" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.greenDark, fontWeight: 600, textDecoration: 'underline' }}>GB 2760-2024</a>: 中国食品安全国家标准《食品添加剂使用标准》，规定了添加剂的使用范围及用量。
          </li>
          <li>
            <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.greenDark, fontWeight: 600, textDecoration: 'underline' }}>USDA FoodData Central</a>: 美国农业部食物成分数据库，用于营养成分参考。
          </li>
          <li>
            <a href="https://www.who.int/publications/i/item/9789241549028" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.greenDark, fontWeight: 600, textDecoration: 'underline' }}>WHO Guidelines</a>: 世界卫生组织关于糖、钠摄入的健康建议指南。
          </li>
        </ul>
        <p style={{ fontSize: '0.8rem', color: COLORS.textLight, marginTop: '1.5rem', textAlign: 'center', fontStyle: 'italic' }}>
          * 本工具仅作为健康饮食辅助参考，不构成医疗诊断建议。如有严重健康疑问请咨询专业医生。
        </p>
      </motion.section>
    </main>
  );
}
