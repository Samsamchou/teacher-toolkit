# 第一批人物參考圖（Codex）：同一套玩具人偶畫風，正面全身 A 字站姿，方便 Tripo 綁骨架
BASE = ("Use your built-in image generation tool to create one image: a single handcrafted painted wooden-and-felt toy figurine "
        "(about 8 cm tall, tabletop miniature, stylized 3D animated-film toy look, slightly large head, friendly kind face with simple painted eyes and a small smile), "
        "{who}. Full body, standing straight facing the camera in a relaxed A-pose with arms held slightly away from the body and legs slightly apart, "
        "feet flat, hands open and visible, nothing held in the hands, whole figure visible from head to feet, centered, plain pure white background, "
        "soft even studio lighting, no shadow on the background, no base or stand, no other objects, no text. "
        "Save the PNG as {name}.png in the current directory. Reply with the saved file path only.")
CHARS = {
 "pilgrim_man": "an English Pilgrim man of the 1620s: tall dark felt hat with a flat brim and no buckle, brown wool doublet with a plain white falling collar, dark green knee breeches, grey stockings, simple brown leather shoes, short brown beard",
 "pilgrim_woman": "an English Pilgrim woman of the 1620s: white linen coif cap over her hair, dusty-red wool long dress with a white collar and a cream apron, simple brown shoes",
 "pilgrim_child": "an English Pilgrim girl about 8 years old in the 1620s: small white coif cap, mustard-yellow long dress with a white collar and a cream apron, simple brown shoes",
 "wampanoag_man": "a friendly Wampanoag man from 1620s New England, fully clothed: a long-sleeved soft tan deerskin tunic that reaches the knees with a simple fringe at the hem, tan deerskin trousers, a brown deerskin cape over both shoulders, a simple white shell-bead necklace, long black hair tied back with a leather cord, soft moccasin shoes, no feathers, no headdress, no face paint",
 "wampanoag_woman": "a cheerful mother from the Wampanoag Nation (the Indigenous people of Massachusetts) in the year 1620, wearing a long-sleeved brown buckskin dress down to her ankles and a light brown buckskin cape over her shoulders, a woven reed shoulder bag, long black hair in one neat braid, soft moccasin shoes, no feathers, no headdress, no face paint",
 "wampanoag_child": "a friendly Wampanoag boy about 8 years old from 1620s New England, fully clothed: a long-sleeved soft tan deerskin tunic to the knees and tan deerskin trousers, soft moccasin shoes, black hair in a short ponytail, no feathers, no headdress, no face paint",
 "wetu": None,
}
WETU = ("Use your built-in image generation tool to create one image: a single handcrafted tabletop miniature (about 12 cm wide) of a Wampanoag wetu, "
        "a dome-shaped home made of bent wooden saplings covered with overlapping tan bark panels and woven reed mats, a low doorway covered by a hanging deerskin flap, "
        "a small smoke hole at the top, stylized 3D animated-film toy look, seen from a 3/4 front view, full object visible, centered, plain pure white background, "
        "soft even studio lighting, no shadow on the background, no people, no other objects, no text. Save the PNG as wetu.png in the current directory. Reply with the saved file path only.")
import sys
n = sys.argv[1]
print(WETU if n == "wetu" else BASE.format(who=CHARS[n], name=n))
