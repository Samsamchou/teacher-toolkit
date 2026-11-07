# 第二批參考圖（Codex）：兩位有名字的萬帕諾亞格族人物用第一批男性當畫風參考；道具同一套毛氈木頭玩具風
import sys
TAIL = (" Full body, standing straight facing the camera in a relaxed A-pose with arms held slightly away from the body, hands open and empty, "
        "whole figure visible, centered, plain pure white background, soft even studio lighting, no feathers, no headdress, no face paint, no text.")
P = {
 "tisquantum": "Use your built-in image generation tool. The attached image is a handcrafted felt-and-wood toy figurine. Create a new matching figurine in exactly the same toy style, materials, lighting and white background: his friend Tisquantum, a helpful Wampanoag man, a little taller and slimmer, wearing a long-sleeved tan felt tunic to the knees with fringe, tan trousers, a dark brown felt cape, a woven sash in muted orange and brown across his chest, a small leather pouch at the waist, long black hair in one braid, soft moccasin shoes." + TAIL,
 "massasoit": "Use your built-in image generation tool. The attached image is a handcrafted felt-and-wood toy figurine. Create a new matching figurine in exactly the same toy style, materials, lighting and white background: Massasoit, a respected older Wampanoag leader with a calm kind face and a few grey strands in his long black hair tied back, wearing a long-sleeved tan felt tunic to the knees with fringe, tan trousers, a large dark brown felt mantle over both shoulders, and a wide collar made of white and purple shell beads, soft moccasin shoes." + TAIL,
}
PROP = ("Use your built-in image generation tool to create one image: a single handcrafted felt-and-wood tabletop toy miniature, stylized 3D animated-film toy look, {what}, "
        "seen from a 3/4 front view, full object visible, centered, plain pure white background, soft even studio lighting, no shadow on the background, no people, no other objects, no text or letters.")
PROPS = {
 "cottage": "a small 1620s English Pilgrim cottage (about 10 cm wide) with brown wooden plank walls, a steep golden thatched straw roof, a small wooden door, two small windows and a little stone chimney",
 "corn": "one tall green corn plant (about 10 cm tall) made of felt with long leaves, two yellow corn cobs with husks and a tassel on top, standing on a small round patch of brown soil",
 "harvest_basket": "a woven straw harvest basket (about 6 cm wide) full of yellow corn cobs, small orange pumpkins, green and yellow squash and a few red-brown beans",
 "feast_table": "a long rustic wooden table (about 14 cm long) set for a shared harvest meal, with wooden bowls of corn, beans and squash, a platter of roasted fish, a round loaf of bread and pumpkins, a simple cream cloth runner",
 "desk_calendar": "a small wooden flip desk calendar (about 7 cm wide) on a stand, with a blank cream paper page showing only an empty grid of boxes",
}
n = sys.argv[1]
print(P[n] + f" Save the PNG as {n}.png in the current directory. Reply with the saved file path only." if n in P else PROP.format(what=PROPS[n]) + f" Save the PNG as {n}.png in the current directory. Reply with the saved file path only.")
