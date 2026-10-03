export function courseName(value) {
  if(typeof value!=='string'||!value.trim())throw new Error('請輸入課程名稱，不能只填空白。');
  if(value.length>200)throw new Error('課程名稱不能超過 200 字元。');
  return value.trim();
}
