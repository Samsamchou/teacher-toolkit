shader_type spatial;
// 關卡方塊：仿 Kenney Platformer Kit 的卡通草皮＋泥土。頂面草地（淡淡棋盤格幫助判斷距離），
// 側面上緣有一圈波浪草邊，下方是條紋泥土。只用顏色，不需要貼圖（下載量小）。
render_mode diffuse_lambert, specular_disabled;

uniform vec3 grass : source_color = vec3(0.36, 0.78, 0.45);
uniform vec3 grass2 : source_color = vec3(0.30, 0.70, 0.40);
uniform vec3 dirt : source_color = vec3(0.86, 0.50, 0.32);
uniform vec3 dirt2 : source_color = vec3(0.74, 0.40, 0.26);
uniform float half_h = 1.0;     // 方塊高度的一半（模型座標頂面 y）
uniform float lip = 0.45;       // 草邊厚度
uniform float wood = 0.0;       // 1 = 木板（移動平台）

varying vec3 lp;
varying vec3 wp;
varying vec3 ln;

void vertex() {
	lp = VERTEX;
	ln = NORMAL;
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float top = step(0.5, ln.y);
	float bottom = step(0.5, -ln.y);
	float wave = 0.12 * sin(wp.x * 2.3 + wp.z * 0.7) + 0.08 * sin(wp.z * 3.1 + 1.0);
	float in_lip = step(half_h - lip + wave, lp.y) * (1.0 - bottom);
	float g = max(top, in_lip);
	float chk = mod(floor(wp.x * 0.5) + floor(wp.z * 0.5), 2.0);
	vec3 gc = mix(grass, grass2, chk * 0.55);
	float band = smoothstep(0.42, 0.5, fract(wp.y * 0.7)) * (1.0 - smoothstep(0.92, 1.0, fract(wp.y * 0.7)));
	vec3 dc = mix(dirt, dirt2, band * 0.6);
	vec3 col = mix(dc, gc, g);
	if (wood > 0.5) {
		float plank = step(0.92, fract((abs(ln.y) > 0.5 ? wp.x : wp.y) * 1.25));
		col = mix(vec3(0.78, 0.55, 0.32), vec3(0.55, 0.35, 0.2), plank);
	}
	// 底面暗一點，看得出是浮空島
	col *= mix(1.0, 0.6, bottom);
	ALBEDO = col * 0.8;   // 整體壓暗一點，iPad 螢幕上比較不刺眼
	ROUGHNESS = 0.95;
}
