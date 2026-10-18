// build_suno_docx.cjs — 把 17-Suno歌曲-Days-of-the-Week.md 轉成 Word（歌詞／Style 以純文字段落呈現，方便複製貼到 Suno）。
// 歌詞、Style、排除風格三個方塊直接讀取 .md 的 ``` 區塊，確保兩份檔案內容一致。
// 用法: node build_suno_docx.cjs
const fs = require('fs'), path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType, HeadingLevel, LevelFormat, Footer, PageNumber } = require('docx');

const dir = __dirname, src = path.join(dir, '17-Suno歌曲-Days-of-the-Week.md'), out = path.join(dir, '17-Suno歌曲-Days-of-the-Week.docx');
const md = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
const blocks = [...md.matchAll(/```\n([\s\S]*?)```/g)].map(m => m[1].replace(/\n+$/, ''));
if (blocks.length !== 3) throw new Error('expected 3 code blocks, got ' + blocks.length);
const [lyrics, style, exclude] = blocks;

const CJK = 'Microsoft JhengHei', LAT = 'Arial', MONO = 'Consolas';
const font = { ascii: LAT, hAnsi: LAT, eastAsia: CJK };
const run = (text, o = {}) => new TextRun({ text, font, size: 22, ...o });
const P = (children, o = {}) => new Paragraph({ spacing: { after: 100, line: 300 }, ...o, children: Array.isArray(children) ? children : [children] });
const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 }, children: [new TextRun({ text: t, font, bold: true, size: 30, color: '1F3A5F' })] });
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 100 }, children: [new TextRun({ text: t, font, bold: true, size: 26, color: '1F3A5F' })] });
const bullet = (children) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 80, line: 300 }, children: Array.isArray(children) ? children : [children] });
const num = (children) => new Paragraph({ numbering: { reference: 'num', level: 0 }, spacing: { after: 80, line: 300 }, children: Array.isArray(children) ? children : [children] });

// 複製方塊：每行一個段落（貼到 Suno 會保留換行），底色淺灰＋邊框；方括弧行加粗
function copyBox(text, { mono = false } = {}) {
  const edge = { style: BorderStyle.SINGLE, size: 6, color: '9AA7B5', space: 6 };
  const lines = text.split('\n');
  return lines.map((ln, i) => new Paragraph({
    spacing: { after: 0, line: 280 },
    shading: { type: ShadingType.CLEAR, fill: 'F3F6FA', color: 'auto' },
    border: { left: edge, right: edge, top: i === 0 ? edge : undefined, bottom: i === lines.length - 1 ? edge : undefined },
    indent: { left: 140, right: 140 },
    children: [new TextRun({ text: ln, font: { ascii: mono ? MONO : LAT, hAnsi: mono ? MONO : LAT, eastAsia: CJK }, size: 22, bold: /^\[.*\]$/.test(ln), color: /^\[.*\]$/.test(ln) ? '1F5FA8' : '000000' })],
  }));
}

const checklist = [
  ['What day is today? / It\'s Saturday. / Let\'s ______.', 'Verse 1', 'Let\'s go to the park!'],
  ['What day is today? / It\'s Sunday. / Let\'s ______.', 'Verse 1', 'Let\'s visit Grandma!'],
  ['Today is Monday. Time for school.', 'Verse 2', '✓'],
  ['Do you have music class on Monday? / No, I don\'t.', 'Verse 2', '✓'],
  ['Do you have PE class on Monday? / Yes, I do.', 'Verse 2', '✓'],
  ['Me, too. I like playing basketball in PE class.', 'Verse 2', '✓'],
  ['Does Andy have Chinese class on Tuesday? / No, he doesn\'t.', 'Verse 3', '✓'],
  ['Does Amy have computer class on Thursday? / Yes, she does.', 'Verse 3', '✓'],
  ['She can chat with an AI robot.', 'Verse 3', '✓（已修正冠詞 an）'],
];
const colW = [5200, 1300, 2526], total = colW.reduce((a, b) => a + b, 0);
const cell = (t, w, head) => new TableCell({
  width: { size: w, type: WidthType.DXA }, margins: { top: 70, bottom: 70, left: 110, right: 110 },
  shading: head ? { type: ShadingType.CLEAR, fill: 'DCE6F2', color: 'auto' } : undefined,
  borders: Object.fromEntries(['top', 'bottom', 'left', 'right'].map(k => [k, { style: BorderStyle.SINGLE, size: 4, color: 'A9B4C2' }])),
  children: [P(run(t, { bold: head, size: 20 }), { spacing: { after: 0 } })],
});
const table = new Table({
  width: { size: total, type: WidthType.DXA }, columnWidths: colW,
  rows: [new TableRow({ children: ['教師指定句 / Required sentence', '位置', '狀態'].map((t, i) => cell(t, colW[i], true)) }),
    ...checklist.map(r => new TableRow({ children: r.map((t, i) => cell(t, colW[i], false)) }))],
});

const children = [
  new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 60 }, children: [new TextRun({ text: 'Days of the Week — K-pop Suno 歌詞與 Style', font, bold: true, size: 40, color: '1F3A5F' })] }),
  P(run('星期與學科｜台灣國小英語｜偏成人偶像團 K-pop group vocals｜中等速度約 104 BPM、語速放慢', { color: '555555' })),
  P(run('日期 2026-10-18　狀態：歌詞與 Style 已撰寫，尚未在 Suno 生成、尚未經教師審閱。', { color: '555555', size: 20 })),
  H1('一、貼到 Suno / Copy into Suno'),
  P([run('使用方式：', { bold: true }), run('在下面灰底方塊中，按住滑鼠從第一行拖曳選取到最後一行（Ctrl+A 會選到整份文件，請不要用），Ctrl+C 複製，貼到 Suno 對應欄位。方塊內每行都是獨立段落，貼上後換行會保留；方括弧 [ ] 是 Suno 的結構標籤，要一起貼。')]),
  H2('A. Lyrics 歌詞（貼到 Suno「Lyrics」）'),
  ...copyBox(lyrics),
  H2('B. Style 曲風（貼到 Suno「Style of Music」）'),
  P(run('約 ' + style.length + ' 字元，單一段落；貼上前請看 Suno 介面的字數提示。', { size: 20, color: '555555' })),
  ...copyBox(style),
  H2('C. Exclude Styles 排除風格（若介面有此欄）'),
  ...copyBox(exclude),
  H1('二、本歌設定與修改紀錄'),
  bullet([run('曲風定案：', { bold: true }), run('偏成人偶像團 K-pop group vocals（男女聲輪唱），不再是兒童人聲。')]),
  bullet([run('速度：', { bold: true }), run('中等、語速放慢——Style 以約 104 BPM、relaxed mid-tempo、unhurried vocal delivery 描述，並以排除欄擋掉 fast rap、rushed vocals、double-time。')]),
  bullet([run('指定句：', { bold: true }), run('全部保留；空格填入 Saturday →「Let\'s go to the park!」、Sunday →「Let\'s visit Grandma!」。教師同意後，AI robot 已修正為「an AI robot」。')]),
  bullet([run('補足題材：', { bold: true }), run('七天在 Intro 全部唱出；Pre-Chorus 唱齊 Chinese、English、math、art、music、PE、computer 七個學科；Bridge 補週三（draw）與週五（play）。')]),
  bullet([run('結構：', { bold: true }), run('Intro、Verse 1–3、Pre-Chorus（2 次）、Chorus（2 次，記憶點句 Monday to Sunday, every day is fun!）、Bridge、Dance Break（8 小節，重複七天口號）、Final Chorus、Outro。')]),
  H1('三、指定句子對照 / Checklist'),
  table,
  H1('四、生成後檢查 / After generation'),
  num(run('逐行聽：指定句是否被唱錯或漏唱；Monday 到 Sunday 七天發音；PE、AI 是否唱成字母。')),
  num(run('人聲應為成人偶像團男女聲；若聽起來像兒童合唱，在 Style 開頭加 "young adult K-pop idol group"，並把 "children\'s choir" 留在排除欄。若 K-pop 味不足，可加 "trendy K-pop idol group choreography energy"。')),
  num(run('量速度與長度：目標約 104 BPM（中等）、語速不急促；預計約 3–3.5 分鐘。若唱太快，Style 再加 "slow tempo around 100 BPM" 並重生；歌詞太擠時，可刪去 Pre-Chorus 的第二次重複。')),
  num(run('Suno 的字數上限、標籤與模型版本會變動，Suno 也不保證遵守 BPM、段落長度與逐字歌詞；確認 Suno 方案使用條款與學校標示規定，仍須教師試聽驗收。')),
  num(run('新 MP3 放專案 sources/，在 qa/ 記錄生成日期、提示詞版本與雜湊。')),
];

const doc = new Document({
  creator: 'Claude Code', title: 'Days of the Week — K-pop Suno Lyrics & Style',
  styles: { default: { document: { run: { font, size: 22 } } } },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1300, right: 1300 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Days of the Week — Suno  ·  ', font, size: 18, color: '888888' }), new TextRun({ children: [PageNumber.CURRENT], font, size: 18, color: '888888' })] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(out, b); console.log('wrote', out, b.length, 'bytes'); });
