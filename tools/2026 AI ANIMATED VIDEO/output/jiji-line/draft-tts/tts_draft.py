import asyncio, json, subprocess, sys, pathlib
import edge_tts

OUT = pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
V = {"F": "zh-TW-HsiaoChenNeural", "M": "zh-TW-YunJheNeural"}
L = [
 ("open","F","嗨！我是小晨。"),
 ("open","M","我是小哲！今天我們要搭小火車，認識集集線！"),
 ("open","F","集集線從彰化二水出發，沿著濁水溪開進南投的山裡。一百多年前，它是為了蓋日月潭發電廠而建的。"),
 ("open","M","我們要停靠五個車站，出發囉！"),
 ("ershui","M","第一站，二水車站！這裡是集集線的起點，也是縱貫線和集集線交會的地方。"),
 ("ershui","F","二水以前叫做「二八水」，名字和濁水溪、八堡圳的傳說有關。"),
 ("ershui","M","以前蒸汽火車會在這裡加水、維修。現在車站還能看到被叫做「蒸汽女王」的老火車頭喔！"),
 ("yuanquan","F","第二站，源泉車站！它的舊名叫做「鼻仔頭」。"),
 ("yuanquan","M","為什麼叫源泉呢？因為附近就是八堡圳的源頭。"),
 ("yuanquan","F","八堡圳是台灣最古老的水圳之一。三百多年來，它把濁水溪的水送到彰化平原，灌溉一大片稻田。"),
 ("yuanquan","M","所以源泉，就是水的源頭！"),
 ("jiji","M","第三站，集集車站！這是一座用檜木蓋的日式木造車站，已經快一百歲了。"),
 ("jiji","F","一九九九年九二一大地震時，車站被震得歪歪斜斜。大家細心修復，讓它恢復原來的樣子。"),
 ("jiji","M","車站附近有集集老街和綠色隧道，可以騎腳踏車，在大樹下吹涼風。"),
 ("shuili","F","第四站，水里車站！水里以前叫做「水裡坑」，是山城裡熱鬧的交通中心。"),
 ("shuili","M","很久以前，要去爬玉山的人常從水里出發。火車快到水里時，天氣好還能看見玉山喔！"),
 ("shuili","F","水里溪旁有大觀、明湖等發電廠。來到水里，別忘了吃一支古早味的枝仔冰！"),
 ("checheng","M","最後一站，車埕車站！這裡是集集線的終點。"),
 ("checheng","F","「埕」是空地的意思。以前山上的木頭用火車運到這裡，車埕成了熱鬧的木材集散地。"),
 ("checheng","M","車站旁的貯木池，以前用來泡木頭，現在變成美麗的生態池。木造車站和木業展示館，都在說著木頭小鎮的故事。"),
 ("ending","F","二水、源泉、集集、水里、車埕，我們走完集集線了！"),
 ("ending","M","停駛將近五年的集集線，在二〇二六年六月恢復全線通車。"),
 ("ending","F","下次和家人一起來搭火車吧！"),
 ("ending","M","掰掰！"),
]
RATE = "-5%"

async def main():
    rows = []
    for i, (sec, who, text) in enumerate(L, 1):
        f = OUT / f"{i:02d}-{sec}-{who}.mp3"
        await edge_tts.Communicate(text, V[who], rate=RATE).save(str(f))
        d = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",str(f)]).decode())
        rows.append({"i": i, "sec": sec, "who": who, "chars": len(text), "dur": round(d, 2), "text": text})
    tot = {}
    for r in rows: tot[r["sec"]] = round(tot.get(r["sec"], 0) + r["dur"] + 0.6, 1)
    (OUT / "timing.json").write_text(json.dumps({"voices": V, "rate": RATE, "lines": rows, "section_sec_with_0.6s_gaps": tot, "total": round(sum(tot.values()), 1)}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(tot, ensure_ascii=False), round(sum(tot.values()), 1))

asyncio.run(main())
