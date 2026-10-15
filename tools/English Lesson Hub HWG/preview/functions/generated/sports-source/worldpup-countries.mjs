// Locked FIFA 2026-07-20 top 50 + Taiwan. Colors are SVG approximations,
// not textile color standards. See qa/world-pup-soccer-20261002/jersey-sources.json.
export const RANKING_DATE = '2026-07-20';
const ADIDAS = 'https://news.adidas.com/football/adidas-reveals-largest-ever-collection-of-home-kits-ahead-of-fifa-world-cup-2026-/s/a62a06a3-ea5a-4cb7-a585-0379b40ab18f';
const NIKE = 'https://about.nike.com/en/newsroom/collections/nike-football-unveils-2026-federation-kits-featuring-aero-fit-performance-cooling-technology';
const PUMA = 'https://mediahub.puma.com/articles/for-the-love-of-the-shirt-puma-launches-football-kits-for-11-nations-for-the-worlds-biggest-stage';
const rows = [
  ['ESP','Spain','西班牙','#e71935','#f6c931','pinstripe',ADIDAS,'2026','#1a254d'],
  ['ARG','Argentina','阿根廷','#f5f7f7','#77c4ed','stripes',ADIDAS,'2026','#172938'],
  ['FRA','France','法國','#123479','#7393cc','speed',NIKE,'2026','#ffffff'],
  ['ENG','England','英格蘭','#fafafa','#182a40','plain',NIKE,'2026','#19283f'],
  ['BRA','Brazil','巴西','#ffe731','#14874e','diamond',NIKE,'2026','#16894f'],
  ['MAR','Morocco','摩洛哥','#db2435','#087449','collar-geo',PUMA,'2026','#087449'],
  ['POR','Portugal','葡萄牙','#c92636','#df4050','waves',PUMA,'2026','#167153'],
  ['BEL','Belgium','比利時','#e82b32','#a61924','flames',ADIDAS,'2026','#edbd39'],
  ['NED','Netherlands','荷蘭','#ff7c13','#ed5109','plain',NIKE,'2026','#121b2c'],
  ['MEX','Mexico','墨西哥','#087849','#70ad83','sun',ADIDAS,'2026','#d63436'],
  ['COL','Colombia','哥倫比亞','#ffe93b','#f0d729','butterflies',ADIDAS,'2026','#de3138'],
  ['GER','Germany','德國','#f8f8f3','#171d2b','germany',ADIDAS,'2026','#151d25'],
  ['CRO','Croatia','克羅埃西亞','#fffafa','#e52837','checks',NIKE,'2026','#ffffff'],
  ['SUI','Switzerland','瑞士','#e3283c','#c51d34','grid',PUMA,'2026','#dc2236'],
  ['ITA','Italy','義大利','#2156ab','#3972c5','grid',ADIDAS,'2026','#e2c47c'],
  ['USA','USA','美國','#fffaf1','#c3293c','wavy-stripes',NIKE,'2026','#18213d'],
  ['JPN','Japan','日本','#254c9c','#7799cb','horizon',ADIDAS,'2026','#a9283d'],
  ['SEN','Senegal','塞內加爾','#fffef4','#e5bf64','textile',PUMA,'2026','#147b56'],
  ['NOR','Norway','挪威','#e42d37','#152c5b','cross',NIKE,'2026','#182c50'],
  ['URU','Uruguay','烏拉圭','#99d3ed','#b3deef','plain',NIKE,'2026','#e8f6fa'],
  ['DEN','Denmark','丹麥','#d81c2e','#ed3141','tonal-stripes','https://www.hummel.dk/en/dbu-26-home-jersey-s-s-pro-tango-red/234190-3365.html','2026','#ffffff'],
  ['IRN','IR Iran','伊朗','#ffffff','#c2c5d1','cheetah','https://majidshop.ir/product/mp-7189/تیشرت-تک-اورجینال-تیم-ملی-1405-مدل-3196','1405 (2026/27)','#f5f5f5'],
  ['AUT','Austria','奧地利','#e32735','#b01c2d','plain',PUMA,'2026','#182027'],
  ['EGY','Egypt','埃及','#d32b32','#772622','pyramids',PUMA,'2026','#212328'],
  ['ECU','Ecuador','厄瓜多','#ffdf14','#efd115','plain','https://www.marathon.store/ec/productos/marca/marathon-sports/camiseta-fef-oficial-mundial-2026/p/bt_AM_11073596','2026','#202949'],
  ['NGA','Nigeria','奈及利亞','#b8e86a','#157342','armor',NIKE,'2026','#d3ed9b'],
  ['TUR','Türkiye','土耳其','#e92c36','#b9192e','chest-band',NIKE,'2026','#c02130'],
  ['AUS','Australia','澳洲','#ffd83b','#168552','side-panels',NIKE,'2026','#14673c'],
  ['ALG','Algeria','阿爾及利亞','#f6f3e7','#277c61','shoulders',ADIDAS,'2026','#19503f'],
  ['CAN','Canada','加拿大','#e9283c','#a6152d','maple',NIKE,'2026','#a51931'],
  ['CIV','Côte d’Ivoire','象牙海岸','#ff761e','#ef4d18','textile',PUMA,'2026','#fd6f1b'],
  ['KOR','Korea Republic','南韓','#f12839','#ba1830','tiger',NIKE,'2026','#be1831'],
  ['UKR','Ukraine','烏克蘭','#ffe932','#f5d725','plain',ADIDAS,'2026','#3775a6'],
  ['PAR','Paraguay','巴拉圭','#fff9ec','#d92d3e','rough-stripes',PUMA,'2026','#233666'],
  ['RUS','Russia','俄羅斯','#d52434','#b8172a','soundwave','https://www.rfs.ru/news/225074?mobile=no','2026','#b6172d'],
  ['POL','Poland','波蘭','#ffffff','#e9edef','feathers',NIKE,'2026','#ba2137'],
  ['SWE','Sweden','瑞典','#ffec24','#2b5584','shoulders',ADIDAS,'2026','#244b78'],
  ['WAL','Wales','威爾斯','#d72a37','#175f45','wales',ADIDAS,'2026','#ffffff'],
  ['HUN','Hungary','匈牙利','#aa2333','#952130','plain',ADIDAS,'2026','#f1e6c7'],
  ['SRB','Serbia','塞爾維亞','#4b22a1','#262450','side-panels','https://capellisport.com/collections/serbia-home-kits/products/mens-serbia-2025-26-home-jersey','2025/26','#27243d'],
  ['COD','Congo DR','剛果民主共和國','#48b0ee','#a4d4f3','tiger','https://www.umbro.com/en/football/club-kits/the-leopards-are-90-minutes-from-history/','2025/26','#df3548'],
  ['SCO','Scotland','蘇格蘭','#122945','#26435b','tartan',ADIDAS,'2026','#ffffff'],
  ['CMR','Cameroon','喀麥隆','#096145','#288f64','cameroon','https://shop.14fourteen.com/Fecafoot-AFCON-2025-Home-Special-Edition/417-RI22574-05-M-S-25','2025 AFCON','#f5d134'],
  ['PAN','Panama','巴拿馬','#e92b34','#ffffff','side-panels','https://www.fepafut.com/blog/2026/05/27/panama-recibe-el-pabellon-nacional-rumbo-al-mundial-2026/','2026','#24304d'],
  ['SVK','Slovakia','斯洛伐克','#183572','#4478c5','mountains','https://futbalsfz.sk/tradicia-v-modernom-prevedeni-slovenska-reprezentacia-ma-nove-dresy/','2026/27','#163664'],
  ['GRE','Greece','希臘','#ffffff','#244d9b','shoulders','https://news.adidas.com/football/adidas-unveils-the-new-home-jersey-of-the-greek-national-football-team/s/f3ce3d10-4ba3-4488-9059-af9480b3eae1','2026','#28509f'],
  ['VEN','Venezuela','委內瑞拉','#7d1636','#68132d','plain',ADIDAS,'2026','#d4ac54'],
  ['CZE','Czechia','捷克','#b82038','#962236','grid',PUMA,'2026','#1d2a46'],
  ['CHI','Chile','智利','#e32d39','#d3212e','stars',ADIDAS,'2026','#ffffff'],
  ['PER','Peru','秘魯','#fffdf4','#d62c3d','sash',ADIDAS,'2026','#ba293c'],
  ['TPE','Taiwan','台灣','#25215a','#4830a2','taiwan','https://www.entes.com.tw/products/2024-26-home-jersey','2024–26','#66b8ed'],
];

export const COUNTRIES = Object.freeze(rows.map(([code,name,zh,base,accent,pattern,sourceUrl,year,collar],index) => Object.freeze({
  code, name, zh, rank: code === 'TPE' ? 174 : index + 1, year, base, accent, pattern, collar,
  sourceUrl, rankingDate:RANKING_DATE, kit:'home',
  visualStatus:code === 'PAN' ? 'official-back-photo-partial' : code === 'SVK' ? 'official-launch-photo-partial' : 'official-visual-reference',
})));
export const COUNTRY_BY_CODE = Object.freeze(Object.fromEntries(COUNTRIES.map(country => [country.code,country])));
export const DEFAULT_COUNTRY_CODES = Object.freeze(['TPE','ARG','BRA','FRA','JPN','ESP','ENG','GER']);
export function getCountry(code) { return COUNTRY_BY_CODE[code] || COUNTRY_BY_CODE.TPE; }
