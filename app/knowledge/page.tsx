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

const ANTI_INFLAMMATORY_CATEGORIES = [
  {
    id: 'pro-inflammatory',
    title: '促炎食物（应减少摄入）',
    icon: '🔥',
    color: '#e74c3c',
    bgColor: '#fdecea',
    description: '长期大量摄入促炎食物会导致慢性低度炎症，增加心血管疾病、糖尿病等慢性病风险。',
    items: [
      { name: '超加工食品', desc: '薯片、方便面、甜点等。含高量添加糖、精制碳水和反式脂肪，会激活 NF-κB 炎症通路。', tag: '高促炎' },
      { name: '含糖饮料', desc: '碳酸饮料、奶茶、果汁饮料。高果糖摄入促进尿酸生成，加剧炎症反应。', tag: '高促炎' },
      { name: '精制碳水', desc: '白米饭、白面包、白面条。高升糖指数食物导致血糖快速飙升，刺激炎性因子释放。', tag: '中促炎' },
      { name: '红肉及加工肉类', desc: '猪牛羊肉、香肠、培根、火腿。富含饱和脂肪和亚硝酸盐，IARC 1类致癌物。', tag: '高促炎' },
      { name: '反式脂肪食品', desc: '人造黄油、植脂末、起酥油。人工反式脂肪会显著升高 IL-6 和 CRP 等炎症标志物。', tag: '极高促炎' },
      { name: '高 Omega-6 油脂', desc: '玉米油、大豆油、葵花籽油。Omega-6 过量时转化为促炎性花生四烯酸。', tag: '中促炎' },
    ]
  },
  {
    id: 'anti-inflammatory',
    title: '抗炎食物（建议多吃）',
    icon: '🛡️',
    color: '#16a085',
    bgColor: '#e8f8f5',
    description: '抗炎食物富含多酚、Omega-3 等活性成分，能降低体内炎症标志物水平。',
    items: [
      { name: '深海鱼类', desc: '三文鱼、鲭鱼、沙丁鱼、鳕鱼。富含 EPA 和 DHA，能直接抑制促炎因子 TNF-α 和 IL-1β。', tag: '强抗炎' },
      { name: '浆果类', desc: '蓝莓、草莓、蔓越莓、黑莓。花青素含量极高，天然的抗氧化和抗炎利器。', tag: '强抗炎' },
      { name: '十字花科蔬菜', desc: '西兰花、羽衣甘蓝、花椰菜、卷心菜。富含萝卜硫素，激活 Nrf2 抗炎通路。', tag: '强抗炎' },
      { name: '深色叶菜', desc: '菠菜、芥蓝、小白菜。富含叶酸、维生素 K 和类黄酮，支持抗炎代谢。', tag: '中抗炎' },
      { name: '姜黄与香辛料', desc: '姜黄（姜黄素）、生姜（姜辣素）、大蒜（大蒜素）。姜黄素与黑胡椒同食吸收率提高 2000%。', tag: '强抗炎' },
      { name: '坚果与种子', desc: '核桃、杏仁、亚麻籽、奇亚籽。核桃富含 ALA 型 Omega-3，亚麻籽是植物性 Omega-3 之王。', tag: '中抗炎' },
      { name: '发酵食物', desc: '酸奶、纳豆、味噌、开菲尔。益生菌改善肠道菌群，70% 的免疫细胞位于肠道。', tag: '中抗炎' },
      { name: '健康油脂', desc: '特级初榨橄榄油、牛油果油。橄榄油中的 Oleocanthal 具有类似布洛芬的抗炎效果。', tag: '强抗炎' },
      { name: '绿茶与白茶', desc: '富含 EGCG（表没食子儿茶素没食子酸酯），强效抗氧化和抗炎多酚。', tag: '中抗炎' },
      { name: '全谷物', desc: '燕麦、藜麦、糙米、荞麦。膳食纤维被肠道菌群发酵产生短链脂肪酸（SCFA），具有抗炎作用。', tag: '中抗炎' },
    ]
  },
  {
    id: 'nutrients',
    title: '关键抗炎营养素',
    icon: '🧬',
    color: '#d4a017',
    bgColor: '#fef9e7',
    description: '了解核心抗炎营养素及其作用机制，帮助有针对性地选择食物。',
    items: [
      { name: 'Omega-3 脂肪酸', desc: '包括 EPA、DHA（鱼油）和 ALA（植物源）。每周至少吃 2 次深海鱼，或每日补充 2g 鱼油。', tag: '核心' },
      { name: '多酚类化合物', desc: '花青素（浆果）、白藜芦醇（葡萄皮）、EGCG（绿茶）、槲皮素（洋葱）。颜色越深含量越高。', tag: '核心' },
      { name: '姜黄素', desc: '姜黄的主要活性成分。脂溶性，需搭配油脂和黑胡椒（胡椒碱）食用以提高生物利用度。', tag: '重要' },
      { name: '维生素 D', desc: '调节免疫系统，抑制促炎因子。来源：日晒、三文鱼、蛋黄、强化食品。大部分人缺乏。', tag: '重要' },
      { name: '膳食纤维', desc: '可溶性纤维（燕麦 β-葡聚糖）和不可溶性纤维。每日建议 25-30g，目前国人平均仅约 10g。', tag: '核心' },
      { name: '类胡萝卜素', desc: 'β-胡萝卜素（胡萝卜）、番茄红素（番茄）、叶黄素（菠菜）。脂溶性，烹饪后吸收更好。', tag: '辅助' },
    ]
  },
  {
    id: 'principles',
    title: '抗炎饮食原则',
    icon: '📋',
    color: '#8e44ad',
    bgColor: '#f5eef8',
    description: '将抗炎理念融入日常饮食的实用指南。',
    items: [
      { name: '彩虹饮食法', desc: '每天摄入至少 5 种不同颜色的蔬果，确保获取多种抗氧化剂和植物化学物。红黄绿紫白各有功效。', tag: '基础' },
      { name: 'Omega-3/6 平衡', desc: '理想比例 1:1~1:4，现代饮食普遍达到 1:15 甚至 1:25。减少植物油，增加鱼类和亚麻籽。', tag: '关键' },
      { name: '地中海饮食模式', desc: '以蔬果、全谷物、豆类、鱼类、橄榄油为主。研究证实可降低 CRP 等炎症标志物 30-40%。', tag: '推荐' },
      { name: '控制添加糖', desc: 'WHO 建议每日添加糖不超过 25g（约 6 茶匙）。高糖饮食是慢性炎症的重要驱动因素之一。', tag: '基础' },
      { name: '重视肠道健康', desc: '70% 免疫细胞在肠道。多吃发酵食物和膳食纤维，避免不必要的抗生素，培养健康菌群。', tag: '关键' },
      { name: '选择低加工食物', desc: '优先天然、完整食物（whole food），减少加工环节就是减少促炎成分。配料表成分越少越好。', tag: '基础' },
      { name: '合理烹饪方式', desc: '优先蒸煮炖，减少油炸烧烤。高温烹饪产生 AGEs（糖基化终末产物），直接促进炎症。', tag: '实用' },
    ]
  },
];

export default function KnowledgePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'iarc' | 'dietary' | 'anti'>('iarc');

  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const filteredGuidelines = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return DIETARY_GUIDELINES;
    return DIETARY_GUIDELINES.filter(item =>
      item.category.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.tips.toLowerCase().includes(query) ||
      item.amount.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const filteredAntiInflammatory = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return ANTI_INFLAMMATORY_CATEGORIES;
    return ANTI_INFLAMMATORY_CATEGORIES.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query) ||
        item.tag.toLowerCase().includes(query)
      )
    })).filter(cat =>
      cat.items.length > 0 ||
      cat.title.toLowerCase().includes(query) ||
      cat.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const isSectionOpen = (id: string) => {
    if (searchQuery.trim()) {
      return filteredAntiInflammatory.some(cat => cat.id === id);
    }
    return openSections.has(id);
  };

  const TABS = [
    { key: 'iarc' as const, label: 'IARC 分级', accent: COLORS.red },
    { key: 'dietary' as const, label: '膳食指南', accent: COLORS.green },
    { key: 'anti' as const, label: '抗炎饮食', accent: '#16a085' },
  ];

  const searchPlaceholder = activeTab === 'iarc'
    ? '搜索关键词（如：代糖、培根、辐射...）'
    : activeTab === 'dietary'
    ? '搜索食物类别（如：蔬菜、水果...）'
    : '搜索关键词（如：姜黄、Omega-3...）';

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

      {/* Tab 栏 */}
      <div style={{ display: 'flex', marginBottom: '1.25rem', borderBottom: `2px solid ${COLORS.greenLight}` }}>
        {TABS.map(tab => (
          <motion.button
            key={tab.key}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
            style={{
              flex: 1,
              padding: '0.7rem 0.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? `3px solid ${tab.accent}` : '3px solid transparent',
              color: activeTab === tab.key ? COLORS.text : COLORS.textLight,
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'color 0.2s',
              marginBottom: '-2px',
            }}
          >
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* 搜索框 */}
      <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
        <input
          type="text"
          placeholder={searchPlaceholder}
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

      {/* IARC 分级 */}
      {activeTab === 'iarc' && (
        <motion.section
          key="iarc"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ marginBottom: '2rem' }}
        >
          <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: COLORS.textLight, marginBottom: '1.25rem', marginTop: 0 }}>
            国际癌症研究机构（IARC）将物质的致癌风险分为四个主要等级。<strong style={{ color: COLORS.text }}>请注意：分级是基于"证据的确定性"，而不是"毒性的强弱"。</strong>{' '}
            科学界公认的一条原则是：<strong style={{ color: COLORS.text }}>"脱离剂量谈毒性是不科学的。"</strong>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AnimatePresence mode="popLayout">
              {filteredLevels.length > 0 ? (
                filteredLevels.map((item) => (
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
        </motion.section>
      )}

      {/* 膳食指南 */}
      {activeTab === 'dietary' && (
        <motion.section
          key="dietary"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ marginBottom: '2rem' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            <AnimatePresence mode="popLayout">
              {filteredGuidelines.length > 0 ? (
                filteredGuidelines.map((item, idx) => (
                  <motion.div
                    key={item.key}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.03 }}
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
                ))
              ) : (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ textAlign: 'center', color: COLORS.textLight, padding: '2rem', gridColumn: '1 / -1' }}
                >
                  未找到相关膳食内容
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      )}

      {/* 抗炎饮食 */}
      {activeTab === 'anti' && (
        <motion.section
          key="anti"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ marginBottom: '2rem' }}
        >
          <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: COLORS.textLight, marginBottom: '1.25rem', marginTop: 0 }}>
            慢性低度炎症是众多现代疾病的共同根源。通过饮食调节炎症水平，是最经济、最日常的健康干预方式。
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredAntiInflammatory.map((cat) => {
              const open = isSectionOpen(cat.id);
              return (
                <motion.div
                  key={cat.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    borderRadius: '12px',
                    border: `1px solid ${cat.color}33`,
                    overflow: 'hidden',
                  }}
                >
                  <motion.button
                    onClick={() => toggleSection(cat.id)}
                    whileHover={{ backgroundColor: cat.bgColor }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '1rem 1.25rem',
                      background: open ? cat.bgColor : '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s',
                    }}
                  >
                    <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{cat.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: COLORS.text }}>{cat.title}</div>
                      <div style={{ fontSize: '0.8rem', color: COLORS.textLight, marginTop: '0.15rem' }}>{cat.description}</div>
                    </div>
                    <motion.span
                      animate={{ rotate: open ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ fontSize: '1rem', color: cat.color, flexShrink: 0, fontWeight: 700 }}
                    >
                      ▼
                    </motion.span>
                  </motion.button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0.5rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {cat.items.map((item) => (
                            <div
                              key={item.name}
                              style={{
                                display: 'flex',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                background: cat.bgColor,
                                alignItems: 'flex-start',
                              }}
                            >
                              <span style={{
                                flexShrink: 0,
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: '#fff',
                                background: cat.color,
                                whiteSpace: 'nowrap',
                                marginTop: '0.1rem',
                              }}>
                                {item.tag}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: COLORS.text }}>{item.name}</div>
                                <div style={{ fontSize: '0.82rem', color: COLORS.textLight, lineHeight: 1.5, marginTop: '0.2rem' }}>{item.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {searchQuery.trim() && filteredAntiInflammatory.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: 'center', color: COLORS.textLight, padding: '1rem' }}
              >
                未找到相关抗炎饮食内容
              </motion.p>
            )}
          </div>
        </motion.section>
      )}

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
