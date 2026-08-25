import argparse
import json

from grade4_sem1_lesson_data import SOURCES, UNITS


def utf16_len(text):
    return len(text.encode("utf-16-le")) // 2


class SectionBuilder:
    def __init__(self):
        self.parts = []
        self.styles = []
        self.links = []
        self.offset = 0

    def add(self, text="", style=None, link=None):
        paragraph = f"{text}\n"
        start = self.offset
        end = start + utf16_len(paragraph)
        self.parts.append(paragraph)
        if style:
            self.styles.append(
                {"startOffset": start, "endOffset": end, "namedStyleType": style}
            )
        if link:
            label_start = start + utf16_len(text[: text.index(link["label"])])
            label_end = label_start + utf16_len(link["label"])
            self.links.append(
                {
                    "startOffset": label_start,
                    "endOffset": label_end,
                    "url": link["url"],
                }
            )
        self.offset = end

    def result(self):
        return {
            "text": "".join(self.parts),
            "styles": self.styles,
            "links": self.links,
        }


def field(builder, label, value):
    builder.add(f"{label}｜{value}")


def build_sections_1_3():
    b = SectionBuilder()
    b.add("一、分析結論", "HEADING_1")
    b.add("本次更新範圍", "HEADING_3")
    b.add("四年級上學期共4個單元、20節課；每節均含Warm-up、Presentation、Production、Wrap-up，共80個教學階段。")
    b.add("在地課程原單元及既定活動為主軸；英語只用來協助觀察、提問、查證、合作與成果表達，不更換鐵道主題。")
    b.add("原本需校外踏查的活動，改以官方照片、影片、地圖、教師自編圖像讀本與模擬資料完成教室內探究，不假裝學生曾到現場。")
    b.add("英語進度與適齡原則", "HEADING_3")
    b.add("句型優先取自三、四年級英語部定課程實際已學內容；例如扇形車庫使用三下What’s this? It’s a...／What’s that? It’s a...，不再使用不符進度的What is it?")
    b.add("鐵道專有詞以圖卡、聽辨、指認與口說為主，不列為大量拼寫；每節只保留可支持在地任務的核心字詞、1至2個句型或生活用語。")
    b.add("課綱與成果原則", "HEADING_3")
    b.add("四份教案的領域課綱均分成學習表現與學習內容兩欄，逐條列出代碼及完整敘述，並附在本單元中的具體證據。")
    b.add("學習目標由原目標向外擴充至在地知識、資料證據、英語口說、合作、安全與作品產出；評量仍以在地知識和證據為主要比重。")

    b.add("二、單元融入可行性比對", "HEADING_1")
    b.add("判斷方法", "HEADING_3")
    b.add("先比對在地活動需要的溝通功能，再比對英語部定課程及聽說評量手冊；不因英語課本出現某主題，就把不相關單字硬塞進鐵道活動。")
    for unit in UNITS:
        b.add(
            f"{unit['weeks']}｜{unit['title']}｜{unit['lessons_count']}節",
            "HEADING_2",
        )
        field(b, "融入判斷", unit["alignment_note"])
        field(b, "核心成果", unit["core_output"])
        for activity, source, language, reason in unit["english_match"]:
            b.add(f"活動：{activity}｜課程來源：{source}｜英語：{language}｜理由：{reason}")

    b.add("三、上學期架構", "HEADING_1")
    b.add("四個單元總表（文字版）", "HEADING_3")
    for unit in UNITS:
        b.add(
            f"{unit['weeks']}｜{unit['title']}｜{unit['lessons_count']}節",
            "HEADING_2",
        )
        field(b, "單元定位", unit["position"])
        field(b, "核心成果", unit["core_output"])
        b.add("主要學習目標", "HEADING_3")
        for index, goal in enumerate(unit["goals"], 1):
            b.add(f"目標{index}｜{goal}")
        b.add("主要英語融入", "HEADING_3")
        for item in unit["manual_integration"]:
            b.add("｜".join(item))
        b.add("課綱對應摘要", "HEADING_3")
        for domain, alignment in unit["curriculum"].items():
            codes_p = "、".join(code for code, _ in alignment["performance"])
            codes_c = "、".join(code for code, _ in alignment["content"])
            b.add(f"{domain}｜學習表現：{codes_p}｜學習內容：{codes_c}")
    return b.result()


def build_sections_5_6():
    b = SectionBuilder()
    b.add("五、使用方式、教材與課綱引用說明", "HEADING_1")
    b.add("四份Word教案的共同結構", "HEADING_2")
    b.add("每一單元依序包含：單元定位與核心成果、學習目標、英語聽說評量手冊融入、建議影片與資料、領域課綱對應、逐節教學流程、自製教材與學習單附錄。")
    b.add("每一節課先用表格式欄位交代主要口說與句型、生活用語、核心字詞、相關字詞及中文翻譯、數位教材、手作教材與本節學習單；再呈現四階段詳細流程。")
    b.add("課綱複製方式", "HEADING_2")
    b.add("各領域均分成「學習表現」與「學習內容」；每一筆都是「課綱代碼＋完整敘述」，教師可直接複製到課程計畫，再依校內格式調整標點。")
    b.add("課綱後的「在本單元中的具體證據」說明學生將如何透過觀察、口說、資料卡、學習單、作品或合作任務展現該項能力。")
    b.add("第3至10週新增規劃", "HEADING_2")
    b.add("第1節已補上二水站最新官方參考、暖身圖提示詞、90秒路線影片製作方法與分鏡提示詞，以及二水／集集／車埕三站閃卡提示詞。")
    b.add("第2至5節已補上時鐘、簡化時刻表、票券、放大模擬車票、購票網站規劃、站務角色、搭車流程及危險動作圖卡提示詞；第6至8節依指示不新增自製教材說明。")
    b.add("8節課均已列出各自學習單初稿與繪製提示詞；所有時刻、車次、票面、條碼和訂票流程均明確標示為模擬教材，不連接真實訂票或付款。")
    b.add("本次已製作圖檔", "HEADING_2")
    b.add("第11至14週教材資料夾共6張可直接使用PNG：六張故事圖卡分兩頁、四張照片教學組、山線／海線簡圖、雙圈圖範例答案、來源三步檢核卡。")
    b.add("第15至20週教材資料夾共16張可直接使用PNG：8張事件卡、同視角雙圖、軌距與糖業圖、今昔照片、六步流程、資料卡、範例答案、資料偵探卡、6張學習單及教師圖像讀本文字稿。")
    source_label_1 = "二水車站最新官方參考（參山國家風景區）"
    b.add(
        f"{source_label_1}：頁面更新日期2026-03-30。",
        link={"label": source_label_1, "url": SOURCES["ershui_station"]["url"]},
    )
    source_label_2 = "集集支線全線復駛官方資料（交通部）"
    b.add(
        f"{source_label_2}：2026-06-25全線復駛。",
        link={"label": source_label_2, "url": SOURCES["jiji_reopen_2026"]["url"]},
    )
    b.add("使用與安全提醒", "HEADING_2")
    b.add("所有外部影片與網頁需由教師課前完整預覽；時刻、票價、營運與開放資訊以授課當日官方資料為準。")
    b.add("模擬購票只使用假資料並停在確認摘要；不得輸入姓名、證件、電話、付款資料、真實條碼或訂票代碼。")
    b.add("學生作品的英語只評已教內容與溝通效果；在地知識、資料證據、交通安全與合作仍是主要評量依據。")

    b.add("六、四年級上學期四單元逐節詳案同步版", "HEADING_1")
    b.add("本節與四份Word教案同步；共20節、80個教學階段。", "HEADING_3")
    for unit in UNITS:
        b.add(
            f"單元{unit['unit_no']}｜{unit['weeks']}｜{unit['title']}（{unit['lessons_count']}節）",
            "HEADING_2",
        )
        b.add("單元定位與核心成果", "HEADING_3")
        field(b, "單元定位", unit["position"])
        field(b, "核心成果", unit["core_output"])
        b.add("學習目標", "HEADING_3")
        for index, goal in enumerate(unit["goals"], 1):
            b.add(f"目標{index}｜{goal}")
        b.add("英語聽說評量手冊融入", "HEADING_3")
        for item in unit["manual_integration"]:
            b.add("｜".join(item))
        b.add("領域課綱對應", "HEADING_3")
        for domain, alignment in unit["curriculum"].items():
            b.add(f"{domain}｜學習表現", "HEADING_3")
            for code, description in alignment["performance"]:
                b.add(f"{code}｜{description}")
            b.add(f"{domain}｜學習內容", "HEADING_3")
            for code, description in alignment["content"]:
                b.add(f"{code}｜{description}")
            field(b, f"{domain}具體證據", alignment["evidence"])
        b.add("逐節教學流程", "HEADING_3")
        for lesson in unit["lessons"]:
            b.add(lesson["title"], "HEADING_2")
            field(b, "本節重點", lesson["focus"])
            b.add("課前準備與英語融入", "HEADING_3")
            field(b, "主要英語口說／句型", lesson["patterns"])
            field(b, "句型來源與進度理由", lesson["pattern_source"])
            field(b, "生活用語", lesson["daily"])
            field(b, "核心英文字詞", lesson["core"])
            field(b, "相關英文字詞與中文", lesson["related"])
            field(b, "數位教材", lesson["digital"])
            field(b, "手作教材", lesson["handmade"])
            field(b, "本節學習單", lesson["worksheet"])
            b.add("詳細教學流程", "HEADING_3")
            for activity in lesson["stages"]:
                b.add(
                    f"{activity['name']}（{activity['minutes']}分鐘）｜{activity['title']}",
                    "HEADING_3",
                )
                field(b, "教師如何教與如何提問", activity["teacher"])
                field(b, "學生如何學與如何互動", activity["students"])
                field(b, "形成性評量／成果", activity["assessment"])
        b.add("自製教材、範例答案與學習單附錄", "HEADING_3")
        for appendix in unit["appendices"]:
            b.add(appendix["title"], "HEADING_3")
            for line in appendix["body"]:
                b.add(line)
    return b.result()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--section", choices=("sections_1_3", "sections_5_6"))
    parser.add_argument(
        "--field",
        choices=("text", "styles", "outline_styles", "links", "summary"),
    )
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--count", type=int, default=6000)
    args = parser.parse_args()

    payload = {
        "sections_1_3": build_sections_1_3(),
        "sections_5_6": build_sections_5_6(),
    }
    if not args.section:
        print(json.dumps(payload, ensure_ascii=False))
        return

    section = payload[args.section]
    if args.field == "text":
        value = section["text"][args.start : args.start + args.count]
        result = {
            "text": value,
            "startOffset": args.start,
            "length": len(value),
            "totalLength": len(section["text"]),
        }
    elif args.field == "styles":
        value = section["styles"][args.start : args.start + args.count]
        result = {
            "styles": value,
            "start": args.start,
            "count": len(value),
            "totalCount": len(section["styles"]),
        }
    elif args.field == "outline_styles":
        outline = [
            item
            for item in section["styles"]
            if item["namedStyleType"] in ("HEADING_1", "HEADING_2")
        ]
        value = outline[args.start : args.start + args.count]
        result = {
            "styles": value,
            "start": args.start,
            "count": len(value),
            "totalCount": len(outline),
        }
    elif args.field == "links":
        result = {"links": section["links"]}
    else:
        result = {
            "textLength": len(section["text"]),
            "styleCount": len(section["styles"]),
            "linkCount": len(section["links"]),
        }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
