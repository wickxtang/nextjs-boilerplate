'use client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

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

export default function KnowledgePage() {
  const router = useRouter();

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
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ fontSize: '0.95rem', lineHeight: 1.6, color: COLORS.textLight, marginBottom: '1.5rem' }}>
          国际癌症研究机构（IARC）将物质的致癌风险分为四个主要等级。<strong style={{ color: COLORS.text }}>请注意：分级是基于“证据的确定性”，而不是“毒性的强弱”。</strong> 
          科学界公认的一条原则是：<strong style={{ color: COLORS.text }}>“脱离剂量谈毒性是不科学的。”</strong>
        </motion.p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {IARC_LEVELS.map((item, idx) => (
            <motion.div 
              key={item.level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 + 0.3 }}
              whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
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
