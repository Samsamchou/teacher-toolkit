import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexPath = new URL("../public/index.html", import.meta.url);

function extractUnitBlock(html, key) {
    const escapedKey = key.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
    const match = html.match(new RegExp(`"${escapedKey}"\\s*:\\s*\\[([\\s\\S]*?)\\n\\s*\\](?:,|\\n\\s*\\};)`));
    assert.ok(match, `找不到 ${key} 題庫區塊`);
    return match[1];
}

test("HWG7-SU 收錄教師確認的六句與中文翻譯", async () => {
    const html = await readFile(indexPath, "utf8");
    const block = extractUnitBlock(html, "HWG7-SU");
    const expected = [
        ["hwg7_su_1", "Would you like some beef sandwiches?", "你想要一些牛肉三明治嗎？"],
        ["hwg7_su_2", "Yes, please.", "好，麻煩了。"],
        ["hwg7_su_3", "I'd like some cheeseburgers.", "我想要一些起司漢堡。"],
        ["hwg7_su_4", "Whose soda is that on the chair?", "椅子上是誰的汽水？"],
        ["hwg7_su_5", "It's my soda.", "它是我的汽水。"],
        ["hwg7_su_6", "Watch out!", "小心！"]
    ];

    assert.equal((block.match(/\bid:\s*"hwg7_su_/g) || []).length, 6);
    for (const [id, sentence, translation] of expected) {
        assert.match(block, new RegExp(`id: "${id}"`));
        assert.ok(block.includes(`en: "${sentence}"`));
        assert.ok(block.includes(`zh: "${translation}"`));
    }
    assert.doesNotMatch(block, /[’‘]/);
    assert.equal((block.match(/ssml:\s*"<speak>/g) || []).length, 6);
});

test("HWG7-U01 收錄教師確認的九個句組與情境中譯", async () => {
    const html = await readFile(indexPath, "utf8");
    const block = extractUnitBlock(html, "HWG7-U01");
    const expected = [
        ["hwg7_u01_1", "Where are you from?", "你來自哪裡？"],
        ["hwg7_u01_2", "I'm from Taiwan.", "我來自臺灣。"],
        ["hwg7_u01_3", "Are you from the UK?", "你來自英國嗎？"],
        ["hwg7_u01_4", "Yes, I am.", "是的，我是。"],
        ["hwg7_u01_5", "She's my friend. She's from the USA.", "她是我的朋友。她來自美國。"],
        ["hwg7_u01_6", "That looks good. Is it curry?", "那看起來不錯。它是咖哩嗎？"],
        ["hwg7_u01_7", "Yes, it is.", "是的，它是。"],
        ["hwg7_u01_8", "Where are you from?", "你們來自哪裡？"],
        ["hwg7_u01_9", "We're from Taiwan.", "我們來自臺灣。"]
    ];

    assert.equal((block.match(/\bid:\s*"hwg7_u01_/g) || []).length, 9);
    for (const [id, sentence, translation] of expected) {
        assert.match(block, new RegExp(`id: "${id}"`));
        assert.ok(block.includes(`en: "${sentence}"`));
        assert.ok(block.includes(`zh: "${translation}"`));
    }
    assert.doesNotMatch(block, /[’‘]/);
    assert.doesNotMatch(block, /來自 美國/);
    assert.equal((block.match(/ssml:\s*"<speak>/g) || []).length, 9);
});

test("HWG7-SU 新難字有教師確認的字典提示", async () => {
    const html = await readFile(indexPath, "utf8");
    const expectedEntries = [
        ["would", "願意／會（禮貌邀請）"],
        ["like", "想要／喜歡"],
        ["some", "一些"],
        ["beef", "牛肉"],
        ["sandwiches", "三明治（複數）"],
        ["please", "請／麻煩了"],
        ["i'd", "我想要（I would 的縮寫）"],
        ["cheeseburgers", "起司漢堡（複數）"],
        ["whose", "誰的"],
        ["soda", "汽水"],
        ["chair", "椅子"],
        ["my", "我的"]
    ];

    for (const [word, translation] of expectedEntries) {
        assert.ok(html.includes(`"${word}": { zh: "${translation}"`), `缺少字典項目：${word}`);
    }
});

test("HWG7-U01 新難字有教師確認的字典提示", async () => {
    const html = await readFile(indexPath, "utf8");
    const expectedEntries = [
        ["are", "是（be 動詞）"],
        ["from", "來自"],
        ["taiwan", "臺灣"],
        ["uk", "英國"],
        ["am", "是（be 動詞）"],
        ["she's", "她是"],
        ["friend", "朋友"],
        ["usa", "美國"],
        ["looks", "看起來"],
        ["curry", "咖哩"]
    ];

    for (const [word, translation] of expectedEntries) {
        assert.ok(html.includes(`"${word}": { zh: "${translation}"`), `缺少字典項目：${word}`);
    }
});

const newlyConfirmedUnits = [
    {
        key: "HWG7-U02",
        idPrefix: "hwg7_u02_",
        expected: [
            ["hwg7_u02_1", "Where are we?", "我們在哪裡？"],
            ["hwg7_u02_2", "You're on a boat.", "你們在船上。"],
            ["hwg7_u02_3", "Where are you going?", "你們要去哪裡？"],
            ["hwg7_u02_4", "We're going to school.", "我們要去上學。"],
            ["hwg7_u02_5", "By boat?", "搭船嗎？"],
            ["hwg7_u02_6", "Yes. How do you go to school?", "是的。你們如何上學？"],
            ["hwg7_u02_7", "I go to school on foot.", "我走路上學。"],
            ["hwg7_u02_8", "He goes to school by car.", "他搭車上學。"]
        ]
    },
    {
        key: "HWG7-U03",
        idPrefix: "hwg7_u03_",
        expected: [
            ["hwg7_u03_1", "What do you do in your free time?", "你休閒時間做什麼？"],
            ["hwg7_u03_2", "I play the piano in my free time.", "我休閒時間彈鋼琴。"],
            ["hwg7_u03_3", "What does Mozart do in his free time?", "莫札特休閒時間做什麼？"],
            ["hwg7_u03_4", "He writes music in his free time.", "他休閒時間作曲。"],
            ["hwg7_u03_5", "I watch TV in my free time.", "我休閒時間看電視。"],
            ["hwg7_u03_6", "What is TV?", "什麼是電視？"],
            ["hwg7_u03_7", "Let me show you.", "讓我展示給你看。"],
            ["hwg7_u03_8", "Look! I play baseball on weekends.", "看！我週末打棒球。"]
        ]
    },
    {
        key: "HWG7-U04",
        idPrefix: "hwg7_u04_",
        expected: [
            ["hwg7_u04_1", "What time do you get up, Joy?", "Joy，你幾點起床？"],
            ["hwg7_u04_2", "I get up at eight o'clock.", "我八點起床。"],
            ["hwg7_u04_3", "What do you do after breakfast?", "你早餐之後做什麼？"],
            ["hwg7_u04_4", "I make a snowman.", "我堆雪人。"],
            ["hwg7_u04_5", "I walk the reindeer.", "我遛馴鹿。"],
            ["hwg7_u04_6", "What time does Santa go home?", "耶誕老人幾點回家？"],
            ["hwg7_u04_7", "He goes home at twelve o'clock.", "他十二點回家。"],
            ["hwg7_u04_8", "What does he do in his free time?", "他休閒時間做什麼？"],
            ["hwg7_u04_9", "He takes an ice bath.", "他泡冰浴。"]
        ]
    },
    {
        key: "HWG5-U04",
        idPrefix: "hwg5_u04_",
        expected: [
            ["hwg5_u04_1", "How many zebras are there?", "有幾隻斑馬？"],
            ["hwg5_u04_2", "One, two, three!", "一、二、三！"],
            ["hwg5_u04_3", "There are three zebras.", "有三隻斑馬。"],
            ["hwg5_u04_4", "Bye, zebras.", "再見，斑馬們。"],
            ["hwg5_u04_5", "Take care!", "保重！"],
            ["hwg5_u04_6", "This lion is hungry!", "這隻獅子餓了！"],
            ["hwg5_u04_7", "Rocky doesn't like tigers.", "Rocky 不喜歡老虎。"],
            ["hwg5_u04_8", "Does he like lions?", "他喜歡獅子嗎？"],
            ["hwg5_u04_9", "No, he doesn't, I guess.", "不，我猜他不喜歡。"]
        ]
    }
];

for (const unit of newlyConfirmedUnits) {
    test(`${unit.key} 收錄教師確認的句子、中文與 ASCII 引號`, async () => {
        const html = await readFile(indexPath, "utf8");
        const block = extractUnitBlock(html, unit.key);

        assert.equal((block.match(new RegExp(`\\bid:\\s*"${unit.idPrefix}`, "g")) || []).length, unit.expected.length);
        for (const [id, sentence, translation] of unit.expected) {
            assert.match(block, new RegExp(`id: "${id}"`));
            assert.ok(block.includes(`en: "${sentence}"`));
            assert.ok(block.includes(`zh: "${translation}"`));
        }
        assert.doesNotMatch(block, /[’‘]/);
        assert.equal((block.match(/ssml:\s*"<speak>/g) || []).length, unit.expected.length);
    });
}

const newDictionaryEntries = [
    ["HWG7-U02", [["you're", "你／你們是、在（You are 縮寫）"], ["boat", "船"], ["school", "學校"], ["by", "搭乘／藉由"], ["how", "如何／多少（依句意）"], ["foot", "腳；on foot 表示走路"], ["goes", "去／回去（第三人稱）"], ["car", "汽車"]]],
    ["HWG7-U03", [["your", "你的"], ["free", "空閒的"], ["play", "彈奏／打（依句意）"], ["piano", "鋼琴"], ["mozart", "莫札特"], ["his", "他的"], ["writes", "寫／作曲（第三人稱）"], ["music", "音樂／作曲"], ["tv", "電視"], ["let", "讓"], ["show", "展示"], ["look", "看"], ["baseball", "棒球"], ["weekends", "週末"]]],
    ["HWG7-U04", [["get", "起身；get up 表示起床"], ["joy", "Joy（人名）"], ["eight", "八"], ["o'clock", "點鐘"], ["after", "之後"], ["breakfast", "早餐"], ["make", "製作／堆"], ["snowman", "雪人"], ["walk", "走；此處為遛"], ["reindeer", "馴鹿"], ["santa", "耶誕老人"], ["home", "家／回家"], ["twelve", "十二"], ["takes", "做／進行（第三人稱）"], ["bath", "浴／洗澡"]]],
    ["HWG5-U04", [["many", "許多／幾"], ["zebras", "斑馬（複數）"], ["one", "一"], ["two", "二"], ["three", "三"], ["bye", "再見"], ["take", "拿；Take care 表示保重"], ["care", "保重／照顧"], ["this", "這／這隻"], ["lion", "獅子"], ["hungry", "餓的"], ["doesn't", "不（第三人稱否定）"], ["tigers", "老虎（複數）"], ["lions", "獅子（複數）"], ["guess", "猜"]]]
];

for (const [unitKey, entries] of newDictionaryEntries) {
    test(`${unitKey} 新難字有教師確認的字典提示`, async () => {
        const html = await readFile(indexPath, "utf8");
        for (const [word, translation] of entries) {
            assert.ok(html.includes(`"${word}": { zh: "${translation}"`), `缺少字典項目：${word}`);
        }
    });
}
