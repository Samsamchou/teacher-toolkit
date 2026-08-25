export type DestinationId = "jiji" | "shuili" | "checheng";

export type Destination = {
  id: DestinationId;
  zh: string;
  en: string;
  emoji: string;
  clue: string;
};

export type TrainService = {
  id: string;
  number: string;
  type: "區間" | "區間快";
  depart: string;
  arrivals: Record<DestinationId, string>;
};

export const DESTINATIONS: Destination[] = [
  {
    id: "jiji",
    zh: "集集",
    en: "Jiji",
    emoji: "🌳",
    clue: "綠色隧道與老車站",
  },
  {
    id: "shuili",
    zh: "水里",
    en: "Shuili",
    emoji: "💧",
    clue: "山城、水岸與地方生活",
  },
  {
    id: "checheng",
    zh: "車埕",
    en: "Checheng",
    emoji: "🪵",
    clue: "木業故事與鐵道終點",
  },
];

export const TRAIN_SERVICES: TrainService[] = [
  {
    id: "train-2703",
    number: "2703",
    type: "區間快",
    depart: "05:54",
    arrivals: { jiji: "06:29", shuili: "06:41", checheng: "06:46" },
  },
  {
    id: "train-2705",
    number: "2705",
    type: "區間",
    depart: "08:00",
    arrivals: { jiji: "08:32", shuili: "08:44", checheng: "08:49" },
  },
  {
    id: "train-2707",
    number: "2707",
    type: "區間快",
    depart: "09:15",
    arrivals: { jiji: "09:51", shuili: "10:03", checheng: "10:08" },
  },
  {
    id: "train-2711",
    number: "2711",
    type: "區間",
    depart: "10:40",
    arrivals: { jiji: "11:12", shuili: "11:24", checheng: "11:29" },
  },
  {
    id: "train-2713",
    number: "2713",
    type: "區間",
    depart: "11:57",
    arrivals: { jiji: "12:32", shuili: "12:44", checheng: "12:49" },
  },
  {
    id: "train-2715",
    number: "2715",
    type: "區間",
    depart: "13:20",
    arrivals: { jiji: "13:52", shuili: "14:04", checheng: "14:09" },
  },
  {
    id: "train-2717",
    number: "2717",
    type: "區間",
    depart: "14:40",
    arrivals: { jiji: "15:12", shuili: "15:24", checheng: "15:29" },
  },
  {
    id: "train-2721",
    number: "2721",
    type: "區間",
    depart: "16:05",
    arrivals: { jiji: "16:37", shuili: "16:49", checheng: "16:54" },
  },
  {
    id: "train-2723",
    number: "2723",
    type: "區間",
    depart: "17:28",
    arrivals: { jiji: "18:01", shuili: "18:13", checheng: "18:18" },
  },
  {
    id: "train-2725",
    number: "2725",
    type: "區間",
    depart: "18:52",
    arrivals: { jiji: "19:23", shuili: "19:35", checheng: "19:40" },
  },
  {
    id: "train-2727",
    number: "2727",
    type: "區間",
    depart: "20:20",
    arrivals: { jiji: "20:52", shuili: "21:04", checheng: "21:09" },
  },
];

export const SCHEDULE_SOURCE = {
  label: "國營臺灣鐵路股份有限公司｜列車時刻／車次查詢",
  url: "https://www.railway.gov.tw/tra-tip-web/tip/tip001/tip112/querybytime",
  checkedAt: "2026-07-29",
};

function taipeiDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function isoFromUtcDate(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function nearestWeekendDates(now = new Date()) {
  const { year, month, day } = taipeiDateParts(now);
  const today = new Date(Date.UTC(year, month - 1, day));
  const weekday = today.getUTCDay();
  const daysUntilFriday = weekday <= 5 ? 5 - weekday : 12 - weekday;
  const friday = new Date(today);
  friday.setUTCDate(today.getUTCDate() + daysUntilFriday);

  return [0, 1, 2].map((offset) => {
    const date = new Date(friday);
    date.setUTCDate(friday.getUTCDate() + offset);
    const iso = isoFromUtcDate(date);
    return {
      iso,
      weekday: ["週五", "週六", "週日"][offset],
      label: new Intl.DateTimeFormat("zh-TW", {
        timeZone: "UTC",
        month: "long",
        day: "numeric",
        weekday: "short",
      }).format(date),
    };
  });
}

export function timeOptions() {
  const options: string[] = [];
  for (let minutes = 5 * 60; minutes <= 22 * 60; minutes += 30) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    options.push(
      `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );
  }
  return options;
}

export function minutesOf(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function filterTrains(start: string, end: string) {
  const startMinutes = minutesOf(start);
  const endMinutes = minutesOf(end);
  return TRAIN_SERVICES.filter((train) => {
    const departMinutes = minutesOf(train.depart);
    return departMinutes >= startMinutes && departMinutes <= endMinutes;
  });
}

export function durationMinutes(depart: string, arrive: string) {
  return minutesOf(arrive) - minutesOf(depart);
}

export function destinationById(id: DestinationId | null) {
  return DESTINATIONS.find((destination) => destination.id === id) ?? null;
}

export function trainById(id: string | null) {
  return TRAIN_SERVICES.find((train) => train.id === id) ?? null;
}
