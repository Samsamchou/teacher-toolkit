"""v3 提示詞：第一批 10 段裡 Seedance 自己變出道具（球棒、籃球、腳踏車、書、桌子、沙發、營火、手把、直笛）。
改法：提示詞完全不寫物品名稱（連 imaginary bat 都不寫），只描述身體怎麼動；規則改成「舞台上只有男孩」。
  python -I mime_v3.py 480p bike tv        # 便宜試拍（約 24 點／段）
  python -I mime_v3.py 720p bike tv ...    # 正式
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_clue_video as m

m.BUDGET = 1100   # 老師 2026-11-10 選方案 B：9 段用 720p 重做（總花費約 1,079 點）
m.RULES = ("This is a silent body-movement performance filmed in one static wide shot. ONLY the boy's own body moves. "
           "The wooden stage floor around him stays completely bare and empty for the entire clip, exactly as in the opening frame: "
           "nothing is ever added to the scene - no objects, no furniture, no equipment, no effects, no glow, no particles. "
           "His hands are always empty: nothing ever appears in his hands, between his hands, at his mouth or near him. "
           "The classroom background never changes. Full body always in frame. "
           "Keep his face, hair, goggles and school uniform exactly as in the opening frame, same 3D cartoon style. "
           "He does not talk or sing. No captions, no subtitles, no text, no other characters.")
m.SHOTS.update({
 "baseball": ("he turns side-on to the camera, feet wide, knees bent, both closed fists stacked together and raised beside his back shoulder, elbows up, rocking his weight; then he swings both fists together in one huge fast horizontal arc across his body, hips and shoulders twisting, finishing with the fists wrapped around his front shoulder",
              "he lets his arms drop, lifts one flat hand to his eyebrows like a visor, and slowly turns his head upward and far to one side as if following something flying away into the distance, mouth open in amazement; then he jumps and punches one empty fist into the air"),
 "basketball": ("he crouches low with knees bent and back leaning forward, one arm out to the side for balance, the other open palm pushing down and springing back up again and again in a fast steady rhythm at knee height, while his head looks left and right",
                "he straightens, jumps straight up with both empty open hands lifted above his forehead, then snaps the top wrist forward and freezes with that arm stretched high and the hand hanging down relaxed; he lands, watches upward, and pumps an empty fist"),
 "bike": ("he stretches both arms forward at chest height with two closed empty fists side by side, a shoulder-width apart, leans his chest forward, and lifts his knees one after the other in big round stepping circles on the spot, bobbing up and down, wind-in-the-face happy expression",
          "keeping both fists out in front, he quickly flicks his right thumb down several times, then tilts his whole body to the left and then to the right like leaning into curves, still stepping in circles with high knees"),
 "english": ("he holds both empty open hands side by side in front of his chest with palms facing up toward his face like an open surface, bends his head down and moves his eyes and head slowly from left to right, again and again, then sweeps one empty hand across from right to left as if flipping something over",
             "he keeps his left palm flat and open and moves his empty right hand over it in small quick scribbling motions with pinched fingers; he stops, scratches the side of his head with one finger and frowns in thought, then his face lights up and he raises one index finger high"),
 "internet": ("standing with knees slightly bent, he holds his empty right hand out at waist height, palm down and cupped, and slides it in small circles and lines over nothing, tapping his index finger down sharply several times, while his eyes stare straight ahead and dart around as if reading",
              "he flicks his index finger up and down repeatedly in the air, then leans his head and neck further and further forward with eyes growing wide and mouth forming a silent 'wow', then pulls back and nods slowly, impressed"),
 "tv": ("he sits down on the bare wooden floor with his legs stretched out in front of him, leaning far back on his left hand in a lazy slouch; his empty right fist points straight forward and his thumb presses down on it again and again, each time he tilts his head with a bored, half-asleep face",
        "suddenly his eyes pop wide, he points straight ahead with his empty index finger, then bursts into huge silent laughter: he holds his belly with both arms, rocks backward and forward, and slaps the bare floor with one open hand"),
 "camping": ("he drops to one knee on the bare floor, raises one empty fist high above his head and pounds it down toward the floor beside his knee three times with big swings, then grabs the air with both empty fists and leans back pulling hard, hand over hand",
             "he sits cross-legged on the bare floor, stretches both empty open palms forward and low, rubs them together quickly and holds them out again, hunching his shoulders and shivering with a cosy smile; then he leans back, points one finger high up and gazes upward in wonder, turning his head slowly"),
 "games": ("he stands with knees bent, both empty hands held close together in front of his belly with fingers curled inward and both thumbs twitching up and down extremely fast; his whole body leans and twists hard to the left, then to the right, tongue sticking out in concentration",
           "he freezes with wide eyes, then throws both empty fists high into the air and jumps with a huge silent cheer; he lands and immediately hunches again with both thumbs twitching fast in front of his belly"),
 "recorder": ("he raises both empty hands in front of his chest and chin, one hand above the other with all fingers curved and pointing sideways, lips pushed forward in a small round 'o'; his fingers lift and press down one after another in a rippling wave, while he blows gently",
              "he lowers nothing and lifts his shoulders and chest in one huge exaggerated breath in, then blows again with round puffed cheeks, fingers rippling, swaying his body side to side and tapping one foot in rhythm"),
})

if __name__ == "__main__":
    res, ids = sys.argv[1], sys.argv[2:]
    est = len(ids) * 6 * (4.2 if res == "480p" else 8.2)
    print("已花", m.spent(), "預估", est, flush=True)
    if m.spent() + est > m.BUDGET: sys.exit(f"會超過上限 {m.BUDGET}：先問老師。")
    for k in ids: m.gen_video(k, res=res)
    print("累計花費", m.spent(), "點", flush=True)
