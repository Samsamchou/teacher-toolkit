const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = "C:\\firebase-deploy\\在地課程\\在地課程4年級上學期教案";
const U3 = path.join(ROOT, "03_第11-14週_閱覽鐵道風華 教材");
const U4 = path.join(ROOT, "04_第15-20週_介紹五分車與認識小火車鐵道 教材");
const U3_BASE = path.join(U3, "_製作素材");
const U4_BASE = path.join(U4, "_製作素材");

function dataUrl(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

const baseCss = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: white; }
  body {
    font-family: "Microsoft JhengHei", "Noto Sans TC", Arial, sans-serif;
    color: #17324d;
  }
  .page {
    position: relative; overflow: hidden; background: #fffdf7;
    width: 100vw; height: 100vh;
  }
  .title { font-weight: 900; letter-spacing: 1px; color: #164a6b; }
  .subtitle { color: #456; font-weight: 700; }
  .name-line { position: absolute; top: 34px; right: 42px; font-size: 22px; }
  .chip { display:inline-block; padding:6px 12px; border-radius:999px; font-weight:800; }
  .note { font-size: 17px; color:#5b6470; line-height:1.45; }
  .card { background:rgba(255,255,255,.95); border:3px solid #b7d5e5; border-radius:24px; box-shadow:0 8px 20px rgba(24,74,107,.10); }
  .line { border-bottom: 2px solid #9eb3bf; height: 34px; }
  .writebox { border:2px dashed #9eb3bf; border-radius:16px; background:rgba(255,255,255,.9); }
  .step { width:42px; height:42px; border-radius:50%; background:#ffb703; color:#17324d; display:inline-flex; align-items:center; justify-content:center; font-weight:900; }
  .footer { position:absolute; left:42px; right:42px; bottom:24px; font-size:16px; color:#5e6b75; display:flex; justify-content:space-between; }
`;

async function render(browser, outPath, width, height, body, extraCss = "") {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>${baseCss}${extraCss}</style>${body}`);
  await page.screenshot({ path: outPath, fullPage: false });
  await page.close();
}

function header(title, sub = "") {
  return `<div class="title" style="font-size:42px">${title}</div>${sub ? `<div class="subtitle" style="font-size:21px;margin-top:4px">${sub}</div>` : ""}`;
}

function blankLines(n) {
  return Array.from({ length: n }, () => `<div class="line"></div>`).join("");
}

async function buildUnit3(browser) {
  const vennBg = dataUrl(path.join(U3_BASE, "_base_雙圈圖.png"));
  await render(
    browser,
    path.join(U3, "05_雙圈圖範例答案_山線與海線.png"),
    1536,
    1024,
    `<div class="page" style="background-image:url('${vennBg}');background-size:cover">
      <div style="position:absolute;left:54px;top:24px">${header("雙圈圖範例答案｜山線與海線", "先自己完成，再用不同色補漏；不要整張照抄。")}</div>
      <div class="card" style="position:absolute;left:85px;top:130px;width:440px;padding:20px 24px">
        <div style="font-size:29px;font-weight:900;color:#d97706">山線 Mountain Line</div>
        <ul style="font-size:22px;line-height:1.55;margin:12px 0 0 24px">
          <li>較靠內陸丘陵與山地</li><li>景觀：山、隧道、河谷</li><li>代表站：勝興、臺中</li><li>連結內陸城鎮</li>
        </ul>
      </div>
      <div class="card" style="position:absolute;right:85px;top:130px;width:440px;padding:20px 24px">
        <div style="font-size:29px;font-weight:900;color:#1976b8">海線 Coast Line</div>
        <ul style="font-size:22px;line-height:1.55;margin:12px 0 0 24px">
          <li>較靠西部海岸與平原</li><li>景觀：海岸、風、平原</li><li>代表站：清水、沙鹿</li><li>連結海線城鎮</li>
        </ul>
      </div>
      <div class="card" style="position:absolute;left:610px;top:190px;width:316px;padding:18px;text-align:center;background:rgba(244,255,223,.94)">
        <div style="font-size:26px;font-weight:900;color:#4f7c29">共同點</div>
        <div style="font-size:20px;line-height:1.6;margin-top:10px">都在臺灣西部<br>都有車站、鋼軌與列車<br>都能運送旅客<br>都會影響地方生活</div>
      </div>
      <div class="footer"><span>圖例：橘＝山線　藍＝海線</span><span>教學簡圖僅呈現相對位置，不作乘車導航。</span></div>
    </div>`
  );

  const sourceBg = dataUrl(path.join(U3_BASE, "_base_來源卡.png"));
  const box = (x, y, color, title, body) => `
    <div class="card" style="position:absolute;left:${x}px;top:${y}px;width:650px;height:330px;padding:24px 28px;border-color:${color};background:rgba(255,255,255,.97)">
      <div style="font-size:27px;font-weight:900;color:${color}">${title}</div>
      <div style="font-size:19px;line-height:1.5;margin-top:10px">${body}</div>
    </div>`;
  await render(
    browser,
    path.join(U3, "06_三種網站來源卡與車站古蹟示範資料.png"),
    1536,
    1024,
    `<div class="page" style="background-image:url('${sourceBg}');background-size:cover">
      <div style="position:absolute;left:40px;top:12px;padding:8px 16px 10px;border-radius:18px;background:rgba(255,255,255,.82)"><div class="title" style="font-size:38px">來源三步檢核｜網站卡＋車站古蹟示範</div><div class="subtitle" style="font-size:19px;margin-top:3px">每一則資料都問：誰發布？何時更新？其他可靠來源相同嗎？</div></div>
      ${box(70, 130, "#155e9a", "來源 A｜官方機關", "例：文化部、交通部、地方政府。<br><b>優點：</b>發布單位與責任清楚。<br><b>檢查：</b>頁面日期、公告範圍、是否仍有效。")}
      ${box(816, 130, "#338044", "來源 B｜機構資料庫", "例：國家文化記憶庫、博物館。<br><b>優點：</b>常有典藏來源與物件說明。<br><b>檢查：</b>提供單位、年代、典藏編號。")}
      ${box(70, 540, "#b57b00", "來源 C｜社群協作網站", "例：Wikipedia。<br><b>用途：</b>找線索與參考文獻。<br><b>限制：</b>任何人都可能編輯，不可作唯一證據；要回到官方或機構來源複核。")}
      ${box(816, 540, "#c74d42", "車站古蹟示範｜舊臺中火車站", "<b>可採敘述：</b>第二代臺中車站於1917年完成，可見紅磚建築特色。<br><b>查證：</b>國家文化記憶庫＋地方政府資料。古蹟等級與現況仍須查當前官方文化資產資料。")}
      <div class="footer"><span>找不到日期就寫「未註明」，不可猜日期。</span><span>教師示範：每一事實旁標 A、B 或 A＋B。</span></div>
    </div>`
  );
}

function worksheetPage(title, subtitle, content, banner) {
  return `<div class="page" style="padding:40px 48px 28px;background:linear-gradient(#fffefa,#f5fbff)">
    ${banner ? `<img src="${banner}" style="position:absolute;left:0;right:0;bottom:0;width:100%;height:250px;object-fit:cover;object-position:center bottom;opacity:.28">` : ""}
    <div style="position:relative">${header(title, subtitle)}</div>
    <div class="name-line">班級：_____　姓名：__________</div>
    <div style="position:relative;margin-top:26px;height:calc(100% - 145px)">${content}</div>
    <div class="footer"><span>二水國小四年級在地課程</span><span>模擬教材｜資料要留來源</span></div>
  </div>`;
}

async function buildUnit4(browser) {
  const banner = dataUrl(path.join(U4_BASE, "_base_五分車學習單橫幅.png"));

  await render(
    browser,
    path.join(U4, "07_五分車與一般火車資料卡.png"),
    1536,
    1024,
    `<div class="page" style="padding:38px 46px;background:#f6fcff">
      ${header("五分車與一般火車資料卡", "圈出：軌道、載運、速度、地點；每項都要說明來源。")}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:30px">
        <div class="card" style="padding:26px;border-color:#e0a82e">
          <div style="font-size:32px;font-weight:900;color:#a76500">五分車 Five-fen Railway</div>
          <div style="font-size:22px;line-height:1.62;margin-top:12px"><b>軌道：</b>762 mm。<br><b>載運：</b>早期以甘蔗、糖包等糖業物資為主，部分路線也曾載客。<br><b>速度：</b>不填單一歷史速度；今日觀光列車依場域規定低速行駛。<br><b>地點：</b>糖廠、甘蔗田周邊；彰化可用溪湖糖廠作例。<br><b>來源：</b>台糖、國家文化記憶庫。</div>
        </div>
        <div class="card" style="padding:26px;border-color:#4d91c4">
          <div style="font-size:32px;font-weight:900;color:#176291">一般火車 Conventional Train</div>
          <div style="font-size:22px;line-height:1.62;margin-top:12px"><b>軌道：</b>臺鐵1067 mm。<br><b>載運：</b>現代以旅客為主，依車種亦有貨運。<br><b>速度：</b>通常較觀光五分車快；實際依車種與路段，不填無來源數字。<br><b>地點：</b>城市、鄉鎮及幹線車站；二水站是在地例。<br><b>來源：</b>臺鐵官方資料。</div>
        </div>
      </div>
      <div class="card" style="margin-top:24px;padding:18px 24px;font-size:21px"><b>共同提醒：</b>兩者都有鋼軌、車輪、牽引車輛與安全規則。照片可證明外形；軌距、歷史用途與速度必須回到文字資料。</div>
      <img src="${banner}" style="position:absolute;bottom:0;left:0;width:100%;height:205px;object-fit:cover;opacity:.22">
    </div>`
  );

  await render(
    browser,
    path.join(U4, "08_雙圈圖範例答案_五分車與一般火車.png"),
    1536,
    1024,
    `<div class="page" style="padding:36px 42px;background:#fffdf4">
      ${header("雙圈圖範例答案｜五分車與一般火車", "先用自己的資料卡完成，再用另一種顏色補漏。")}
      <div style="position:absolute;left:110px;top:170px;width:650px;height:650px;border:8px solid #e1a228;border-radius:50%;background:rgba(255,218,128,.42)"></div>
      <div style="position:absolute;right:110px;top:170px;width:650px;height:650px;border:8px solid #347fb0;border-radius:50%;background:rgba(135,206,235,.38)"></div>
      <div style="position:absolute;left:165px;top:230px;width:380px;font-size:21px;line-height:1.55"><b style="font-size:28px;color:#9b6500">五分車</b><br>• 762 mm<br>• 糖業、甘蔗田與糖廠<br>• 早期運甘蔗／糖包<br>• 部分路線曾載客<br>• 今日部分轉為文化觀光</div>
      <div style="position:absolute;right:165px;top:230px;width:380px;font-size:21px;line-height:1.55"><b style="font-size:28px;color:#176291">一般火車</b><br>• 1067 mm<br>• 連結城市與鄉鎮<br>• 現代以旅客運輸為主<br>• 有不同車種<br>• 速度依車種與路段</div>
      <div class="card" style="position:absolute;left:595px;top:300px;width:346px;padding:20px;text-align:center;background:rgba(255,255,255,.96)">
        <b style="font-size:27px;color:#26734a">共同點</b><br><span style="font-size:20px;line-height:1.55">都有鋼軌、車輪與牽引車輛<br>都能運送人或物<br>都需要維護與安全規則<br>都保存地方交通記憶</span>
      </div>
      <div class="card" style="position:absolute;left:210px;right:210px;bottom:45px;padding:14px 22px;font-size:20px"><b>今昔句：</b>以前五分車主要把甘蔗送到糖廠，現在部分五分車用來導覽糖業文化；這個改變讓舊鐵道有新的保存方式。</div>
    </div>`
  );

  await render(
    browser,
    path.join(U4, "09_四類官方資料偵探卡.png"),
    1536,
    1024,
    `<div class="page" style="padding:38px 46px;background:linear-gradient(135deg,#f4fbff,#fff9e9)">
      ${header("官方資料偵探卡｜軌道・載運・速度・地點", "只摘5–10字重點；沒有資料就寫「未提供」，不能自編數字。")}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:28px">
        ${[
          ["軌道 TRACK", "#e09b21", "五分車：762 mm　／　臺鐵：1067 mm", "台糖、臺鐵"],
          ["載運 CARGO", "#3b9b69", "甘蔗、糖包、旅客；依時代與路線不同", "國家文化記憶庫"],
          ["速度 SPEED", "#4d88c7", "不填無來源數字；觀光列車依場域規定低速行駛", "官方場域資料"],
          ["地點 PLACE", "#c85e58", "糖廠、田野、城市、鄉鎮、車站", "台糖、臺鐵、地方政府"],
        ].map(([t,c,b,s])=>`<div class="card" style="height:300px;padding:24px;border-color:${c}"><div style="font-size:28px;font-weight:900;color:${c}">${t}</div><div style="font-size:21px;line-height:1.5;margin-top:12px">${b}</div><div class="writebox" style="height:105px;margin-top:14px;padding:12px;font-size:18px">我的摘錄：<br><br></div><div style="font-size:17px;margin-top:10px">建議來源：${s}　日期／未註明：________</div></div>`).join("")}
      </div>
    </div>`
  );

  const ws1 = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
      <div class="card" style="padding:18px"><b>一、事件分類</b><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">${["人物","貨物","路線","時代"].map(x=>`<div class="writebox" style="height:110px;padding:10px">${x}<br>卡號：________</div>`).join("")}</div></div>
      <div class="card" style="padding:18px"><b>二、選四張排成故事</b><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">${[1,2,3,4].map(n=>`<div class="writebox" style="height:125px;padding:8px"><span class="step">${n}</span> 卡號：___<br>中文重點：<br>__________</div>`).join("")}</div></div>
    </div>
    <div class="card" style="margin-top:18px;padding:16px;font-size:20px">三、和同伴說：What’s this/that? It’s a train / track / factory.　同伴簽名：__________</div>`;
  await render(browser, path.join(U4, "10_學習單1_五分車故事四格.png"), 1240, 1754,
    worksheetPage("五分車1｜故事四格", "先分類八張事件卡，再選四張完成有證據的故事。", ws1, banner));

  const ws2 = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
      <div class="card" style="height:380px;padding:16px"><b>A｜五分車照片</b><div class="writebox" style="height:285px;margin-top:14px;text-align:center;padding-top:110px;color:#8797a3">貼照片或畫觀察記號</div></div>
      <div class="card" style="height:380px;padding:16px"><b>B｜一般火車照片</b><div class="writebox" style="height:285px;margin-top:14px;text-align:center;padding-top:110px;color:#8797a3">貼照片或畫觀察記號</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px">
      <div class="card" style="padding:16px"><b>照片看得到</b>${blankLines(5)}</div>
      <div class="card" style="padding:16px"><b>資料才知道</b>${blankLines(5)}</div>
    </div>
    <div class="card" style="margin-top:18px;padding:16px">口說：Is it a train? □ Yes, it is.　It’s □ old □ small □ long.　我還要查：________________</div>`;
  await render(browser, path.join(U4, "11_學習單2_雙圖觀察單.png"), 1240, 1754,
    worksheetPage("五分車2｜雙圖觀察單", "只寫照片真正看得到的事；年代、用途與數字要查資料。", ws2, banner));

  const ws3 = `
    <div class="card" style="padding:18px">
      <b>一、軌距量哪裡？</b><div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:14px"><div class="writebox" style="height:180px;padding:16px">五分車：_____ mm<br><br>畫出兩條鋼軌，箭頭要指向內側。</div><div class="writebox" style="height:180px;padding:16px">臺鐵：_____ mm<br><br>兩者依國際分類都屬窄軌。</div></div>
    </div>
    <div class="card" style="margin-top:18px;padding:18px"><b>二、甘蔗運輸六步排序</b><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px">${[1,2,3,4,5,6].map(n=>`<div class="writebox" style="height:110px;padding:10px"><span class="step">${n}</span> 卡號：___<br>英文詞：________</div>`).join("")}</div></div>
    <div class="card" style="margin-top:18px;padding:18px"><b>三、證據句</b><div class="line">五分車軌距是762 mm，早期運送　　　　　　　　　。</div><div class="line">我的來源代碼：　　　　；我不能只從軌距推論　　　　　　。</div></div>`;
  await render(browser, path.join(U4, "12_學習單3_軌距與運輸圖.png"), 1240, 1754,
    worksheetPage("五分車3｜軌距與運輸圖", "量距、排流程、圈證據；不要把1067 mm寫成標準軌。", ws3, banner));

  const ws4 = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      ${["軌道","載運","速度","地點"].map((x,i)=>`<div class="card" style="height:330px;padding:16px"><b>${i+1}. ${x}</b><div class="writebox" style="height:145px;margin-top:12px;padding:10px">5–10字重點：<br><br></div><div style="margin-top:12px">來源名稱：______________</div><div class="line">日期／未註明：</div><div>□ 可採用　□ 要再查</div></div>`).join("")}
    </div>
    <div class="card" style="margin-top:18px;padding:16px"><b>來源三問：</b>□ 誰發布？　□ 何時更新？　□ 其他可靠來源相同嗎？<br>查不到時，我會說：Sorry, I don’t know.</div>`;
  await render(browser, path.join(U4, "13_學習單4_官方資料偵探.png"), 1240, 1754,
    worksheetPage("五分車4｜官方資料偵探", "只抄關鍵詞、留下來源；速度找不到就寫未提供。", ws4, banner));

  const ws5 = `
    <div style="position:relative;height:760px">
      <div style="position:absolute;left:50px;top:20px;width:560px;height:560px;border:7px solid #e1a228;border-radius:50%;background:rgba(255,220,140,.25)"></div>
      <div style="position:absolute;right:50px;top:20px;width:560px;height:560px;border:7px solid #347fb0;border-radius:50%;background:rgba(145,215,240,.22)"></div>
      <div style="position:absolute;left:140px;top:70px;font-size:23px;font-weight:900">五分車</div><div style="position:absolute;right:150px;top:70px;font-size:23px;font-weight:900">一般火車</div>
      <div style="position:absolute;left:500px;top:150px;width:240px;text-align:center;font-weight:900">共同點</div>
    </div>
    <div class="card" style="padding:16px"><b>今昔三句：</b><div class="line">以前　　　　　　　　　　　　　　　　　　　　　　　　　。</div><div class="line">現在　　　　　　　　　　　　　　　　　　　　　　　　　。</div><div class="line">這個改變可能影響　　　　　　　　　　　　　　　　　　　。</div><div style="margin-top:10px">互教用語：How about you?　同伴簽名：__________</div></div>`;
  await render(browser, path.join(U4, "14_學習單5_雙圈比較.png"), 1240, 1754,
    worksheetPage("五分車5｜雙圈比較", "從軌道、載運、速度、地點四面向比較；共同區寫共同點。", ws5, banner));

  const ws6 = `
    <div style="display:grid;grid-template-columns:1fr 120px 1fr;gap:14px;align-items:stretch">
      <div class="card" style="height:500px;padding:18px"><b style="font-size:25px">以前 PAST</b><div class="writebox" style="height:250px;margin-top:12px;text-align:center;padding-top:105px;color:#8797a3">畫圖或貼歷史照片</div>${blankLines(4)}</div>
      <div style="display:flex;flex-direction:column;justify-content:space-around;text-align:center;font-size:44px;color:#e2a11d">➜<br>➜<br>➜</div>
      <div class="card" style="height:500px;padding:18px"><b style="font-size:25px">現在 NOW</b><div class="writebox" style="height:250px;margin-top:12px;text-align:center;padding-top:105px;color:#8797a3">畫圖或貼現代照片</div>${blankLines(4)}</div>
    </div>
    <div class="card" style="margin-top:18px;padding:18px"><b>三個改變箭頭：</b><div class="line">1. 載運改變：</div><div class="line">2. 交通改變：</div><div class="line">3. 地方功能改變：</div></div>
    <div class="card" style="margin-top:18px;padding:18px"><b>英文圖詞：</b> □ train　□ track　□ factory　□ tourism　　來源代碼：________<br>問同伴：Which one do you like?　回答：________________</div>`;
  await render(browser, path.join(U4, "15_學習單6_五分車今昔圖解.png"), 1240, 1754,
    worksheetPage("五分車6｜今昔圖解", "藝術可以有創意；歷史事實要有來源。", ws6, banner));

  await render(
    browser,
    path.join(U4, "16_甘蔗搭小火車_教師圖像讀本文字稿.png"),
    1536,
    1024,
    `<div class="page" style="padding:36px 46px;background:linear-gradient(#fff8dc,#eefcff)">
      ${header("教師自編圖像讀本｜〈甘蔗搭小火車〉", "搭配八張事件卡逐頁說；依官方資料改寫，不假裝是原始史料。")}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:22px">
        ${[
          "1｜彰化平原種植大片甘蔗，農民觀察成熟情形。",
          "2｜農民與糖廠工人把砍下的甘蔗裝上低矮貨車。",
          "3｜田野裡鋪設762毫米軌道，小型機車準備牽引。",
          "4｜五分車牽著多節甘蔗車，沿田間軌道前進。",
          "5｜列車抵達糖廠，甘蔗卸下並送入製糖設備。",
          "6｜糖包完成；公路貨車增加，運輸方式逐漸改變。",
          "7｜部分田間鐵道停用，但留下產業與交通記憶。",
          "8｜今日部分五分車轉為文化觀光，向遊客介紹糖業歷史。",
        ].map((t,i)=>`<div class="card" style="height:154px;padding:18px;font-size:22px;line-height:1.45;border-color:${i<4?"#e6b84b":"#62a3b9"}">${t}<div style="margin-top:10px;font-size:17px;color:#687681">提問：人物／貨物／路線／時代有哪些線索？</div></div>`).join("")}
      </div>
      <img src="${banner}" style="position:absolute;left:0;bottom:0;width:100%;height:170px;object-fit:cover;object-position:center bottom;opacity:.2">
    </div>`
  );
}

(async () => {
  fs.mkdirSync(U3, { recursive: true });
  fs.mkdirSync(U4, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  try {
    await buildUnit3(browser);
    await buildUnit4(browser);
  } finally {
    await browser.close();
  }
  console.log("Teaching assets rendered.");
})();
