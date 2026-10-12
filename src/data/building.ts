/**
 * Static description of the building and its monitoring fabric.
 *
 * Coordinates for the 2D plan and the 3D model plate are expressed as
 * percentages / model units so both views stay in sync with the same data.
 */

export type ZoneStatus = "ok" | "warn" | "alert";

export interface PlanRoom {
  /** label shown inside the room on the plan view */
  cn: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlanNode {
  id: string;
  x: number;
  y: number;
  status: ZoneStatus;
}

export interface FloorZone {
  id: string;
  cn: string;
  en: string;
  rooms: PlanRoom[];
  nodes: PlanNode[];
}

export interface FloorDef {
  id: string;
  /** short label for the hierarchy tree, e.g. "F1" */
  code: string;
  label: string;
  en: string;
  /** dominant function of the floor */
  function: string;
  area: number;
  zones: FloorZone[];
}

export interface SensorReading {
  /** mean interior temperature, °C */
  temp: number;
  /** relative humidity, % */
  rh: number;
  /** CO2 concentration, ppm */
  co2: number;
  /** people currently inside */
  people: number;
  /** electrical load, kW */
  power: number;
  /** on-site PV generation, kW */
  pv: number;
  /** daylight/artificial illuminance, lx */
  lux: number;
  /** acoustic level, dB */
  db: number;
  /** monitored endpoints */
  devices: number;
  /** endpoints reporting normally */
  online: number;
  /** thermal comfort index, PMV */
  pmv: number;
  status: ZoneStatus;
}

export interface DeviceDef {
  id: string;
  cn: string;
  en: string;
  unit: string;
  /** which reading drives this endpoint's live value */
  source: keyof SensorReading;
  seed: number;
}

export const BUILDING = {
  cn: "湖南科技大学 · 立志楼",
  en: "Hunan University of Science and Technology · Lizhi Building",
  district: "湖南省湘潭市 · 雨湖区",
  postcode: "411201",
  built: 2011,
  gfa: 41860,
  height: 46.8,
  floors: 8,
  basement: 1,
  lat: 27.9026,
  lon: 112.9252,
  target: "GB 55015-2021 近零能耗建筑",
  /** metres above ordnance datum */
  elevation: 52.4,
} as const;

const room = (cn: string, x: number, y: number, w: number, h: number): PlanRoom => ({ cn, x, y, w, h });
const node = (id: string, x: number, y: number, status: ZoneStatus = "ok"): PlanNode => ({ id, x, y, status });

export const FLOORS: FloorDef[] = [
  {
    id: "f1",
    code: "F1",
    label: "首层",
    en: "Ground Floor",
    function: "门厅 · 报告厅",
    area: 5860,
    zones: [
      {
        id: "f1-z1",
        cn: "中庭门厅",
        en: "Atrium Lobby",
        rooms: [
          room("中庭", 34, 30, 30, 34),
          room("接待", 6, 30, 25, 30),
          room("文创", 67, 30, 27, 30),
          room("连廊东", 6, 68, 42, 24),
          room("连廊西", 52, 68, 42, 24),
        ],
        nodes: [node("f1-t1", 48, 44), node("f1-c1", 20, 46), node("f1-l1", 78, 46), node("f1-a1", 70, 78)],
      },
      {
        id: "f1-z2",
        cn: "学术报告厅",
        en: "Lecture Hall",
        rooms: [room("报告厅", 20, 18, 60, 46), room("前厅", 30, 70, 40, 18), room("设备间", 82, 70, 14, 20)],
        nodes: [node("f1-r1", 50, 40, "warn"), node("f1-r2", 30, 78), node("f1-r3", 86, 78)],
      },
    ],
  },
  {
    id: "f2",
    code: "F2",
    label: "二层",
    en: "Level 2",
    function: "公共教学 · 计算机房",
    area: 5240,
    zones: [
      {
        id: "f2-z1",
        cn: "公共教室区",
        en: "General Classrooms",
        rooms: [
          room("大教室 A", 6, 12, 40, 34),
          room("大教室 B", 54, 12, 40, 34),
          room("研讨 201", 6, 54, 26, 32),
          room("研讨 202", 38, 54, 26, 32),
          room("研讨 203", 70, 54, 24, 32),
        ],
        nodes: [node("f2-a1", 24, 28), node("f2-a2", 72, 28), node("f2-a3", 18, 70), node("f2-a4", 82, 70)],
      },
      {
        id: "f2-z2",
        cn: "计算中心",
        en: "Compute Centre",
        rooms: [room("机房 1", 8, 16, 36, 30), room("机房 2", 54, 16, 36, 30), room("配电", 8, 60, 30, 26)],
        nodes: [node("f2-s1", 26, 30, "warn"), node("f2-s2", 72, 30), node("f2-s3", 22, 72, "warn")],
      },
    ],
  },
  {
    id: "f3",
    code: "F3",
    label: "三层",
    en: "Level 3",
    function: "实验实训",
    area: 5240,
    zones: [
      {
        id: "f3-z1",
        cn: "电子实验室",
        en: "Electronics Labs",
        rooms: [room("电子 301", 6, 14, 42, 32), room("电子 302", 54, 14, 40, 32), room("耗材库", 6, 56, 26, 30), room("准备间", 38, 56, 56, 30)],
        nodes: [node("f3-e1", 26, 30), node("f3-e2", 74, 30), node("f3-e3", 18, 70)],
      },
      {
        id: "f3-z2",
        cn: "智能制造",
        en: "Smart Manufacturing",
        rooms: [room("数控区", 8, 16, 50, 42), room("装配区", 64, 16, 28, 42), room("仓储", 8, 66, 84, 20)],
        nodes: [node("f3-m1", 32, 36), node("f3-m2", 78, 36, "alert"), node("f3-m3", 50, 76)],
      },
    ],
  },
  {
    id: "f4",
    code: "F4",
    label: "四层",
    en: "Level 4",
    function: "建筑与设计",
    area: 5240,
    zones: [
      {
        id: "f4-z1",
        cn: "设计工作室",
        en: "Design Studios",
        rooms: [room("工坊 401", 6, 12, 44, 38), room("工坊 402", 56, 12, 38, 38), room("评图厅", 6, 58, 44, 28), room("模型室", 56, 58, 38, 28)],
        nodes: [node("f4-d1", 28, 30), node("f4-d2", 74, 30), node("f4-d3", 28, 72)],
      },
      {
        id: "f4-z2",
        cn: "材料实验室",
        en: "Materials Lab",
        rooms: [room("力学", 10, 18, 34, 34), room("耐久", 52, 18, 38, 34), room("养护", 10, 60, 80, 24)],
        nodes: [node("f4-l1", 26, 34, "warn"), node("f4-l2", 70, 34), node("f4-l3", 50, 72)],
      },
    ],
  },
  {
    id: "f5",
    code: "F5",
    label: "五层",
    en: "Level 5",
    function: "科研平台",
    area: 5240,
    zones: [
      {
        id: "f5-z1",
        cn: "智慧建造实验室",
        en: "Smart Construction Lab",
        rooms: [room("孪生舱", 8, 14, 40, 36), room("感知阵列", 56, 14, 36, 36), room("数据机房", 8, 58, 40, 28), room("控制室", 56, 58, 36, 28)],
        nodes: [node("f5-t1", 28, 30), node("f5-t2", 74, 30), node("f5-t3", 28, 72), node("f5-t4", 74, 72)],
      },
      {
        id: "f5-z2",
        cn: "导师工作室",
        en: "Faculty Studios",
        rooms: [room("工作室 501", 10, 16, 36, 30), room("工作室 502", 54, 16, 36, 30), room("会议", 10, 56, 80, 30)],
        nodes: [node("f5-o1", 28, 32), node("f5-o2", 72, 32)],
      },
    ],
  },
  {
    id: "f6",
    code: "F6",
    label: "六层",
    en: "Level 6",
    function: "行政 · 会议",
    area: 5240,
    zones: [
      {
        id: "f6-z1",
        cn: "行政办公",
        en: "Administration",
        rooms: [room("办公 601", 6, 14, 40, 30), room("办公 602", 54, 14, 40, 30), room("档案", 6, 54, 32, 32), room("接待", 46, 54, 48, 32)],
        nodes: [node("f6-a1", 26, 30), node("f6-a2", 74, 30), node("f6-a3", 20, 70)],
      },
      {
        id: "f6-z2",
        cn: "学术会议区",
        en: "Conference Wing",
        rooms: [room("报告厅", 10, 16, 60, 44), room("休息厅", 74, 16, 18, 44), room("同传间", 10, 66, 82, 20)],
        nodes: [node("f6-c1", 40, 38), node("f6-c2", 83, 38, "warn"), node("f6-c3", 50, 76)],
      },
    ],
  },
  {
    id: "f7",
    code: "F7",
    label: "七层",
    en: "Level 7",
    function: "研讨 · 阅览",
    area: 5240,
    zones: [
      {
        id: "f7-z1",
        cn: "开放阅览",
        en: "Open Reading",
        rooms: [room("阅览大厅", 6, 12, 60, 48), room("数字资源", 70, 12, 24, 48), room("静思区", 6, 64, 88, 22)],
        nodes: [node("f7-r1", 30, 34), node("f7-r2", 82, 34), node("f7-r3", 50, 74)],
      },
      {
        id: "f7-z2",
        cn: "研讨空间",
        en: "Seminar Rooms",
        rooms: [room("研讨 1", 10, 16, 26, 34), room("研讨 2", 40, 16, 26, 34), room("研讨 3", 70, 16, 22, 34), room("共享区", 10, 58, 82, 28)],
        nodes: [node("f7-s1", 23, 32), node("f7-s2", 53, 32), node("f7-s3", 80, 32)],
      },
    ],
  },
  {
    id: "f8",
    code: "F8",
    label: "八层",
    en: "Level 8",
    function: "屋面机房 · 观景",
    area: 3980,
    zones: [
      {
        id: "f8-z1",
        cn: "屋面设备层",
        en: "Plant Deck",
        rooms: [room("空调机房", 8, 16, 40, 34), room("光伏汇流", 56, 16, 34, 34), room("水箱", 8, 58, 34, 28), room("电梯机房", 50, 58, 40, 28)],
        nodes: [node("f8-p1", 28, 32, "warn"), node("f8-p2", 73, 32), node("f8-p3", 25, 72), node("f8-p4", 70, 72, "alert")],
      },
      {
        id: "f8-z2",
        cn: "观景平台",
        en: "Sky Terrace",
        rooms: [room("平台", 10, 18, 60, 40), room("咖啡", 74, 18, 18, 40), room("屋面临界", 10, 64, 82, 22)],
        nodes: [node("f8-o1", 40, 38), node("f8-o2", 83, 38)],
      },
    ],
  },
];

export const DEVICE_TYPES: DeviceDef[] = [
  { id: "temp", cn: "温度", en: "Temperature", unit: "°C", source: "temp", seed: 0 },
  { id: "rh", cn: "湿度", en: "Humidity", unit: "%RH", source: "rh", seed: 1 },
  { id: "co2", cn: "二氧化碳", en: "CO₂", unit: "ppm", source: "co2", seed: 2 },
  { id: "people", cn: "人员计数", en: "Occupancy", unit: "人", source: "people", seed: 3 },
  { id: "power", cn: "电耗", en: "Power", unit: "kW", source: "power", seed: 4 },
  { id: "pv", cn: "光伏发电", en: "PV", unit: "kW", source: "pv", seed: 5 },
  { id: "lux", cn: "照度", en: "Illuminance", unit: "lx", source: "lux", seed: 6 },
  { id: "db", cn: "噪声", en: "Noise", unit: "dB", source: "db", seed: 7 },
  { id: "pmv", cn: "热舒适", en: "PMV", unit: "PMV", source: "pmv", seed: 8 },
];

/** Baseline per-floor behaviour, indexed to match FLOORS. */
export const FLOOR_BASE = [
  { temp: 22.6, rh: 49, co2: 640, people: 143, power: 96, pv: 0, lux: 430, db: 52, devices: 96 },
  { temp: 23.1, rh: 47, co2: 720, people: 214, power: 132, pv: 0, lux: 470, db: 55, devices: 112 },
  { temp: 23.4, rh: 45, co2: 690, people: 168, power: 148, pv: 0, lux: 500, db: 58, devices: 128 },
  { temp: 23.0, rh: 46, co2: 610, people: 121, power: 118, pv: 0, lux: 520, db: 54, devices: 104 },
  { temp: 22.4, rh: 44, co2: 560, people: 86, power: 164, pv: 0, lux: 380, db: 49, devices: 148 },
  { temp: 22.8, rh: 48, co2: 590, people: 104, power: 88, pv: 0, lux: 400, db: 47, devices: 88 },
  { temp: 23.6, rh: 50, co2: 680, people: 196, power: 74, pv: 0, lux: 560, db: 44, devices: 92 },
  { temp: 26.9, rh: 41, co2: 470, people: 12, power: 212, pv: 0, lux: 720, db: 66, devices: 136 },
];

export const CHANNELS = [
  { id: "depth", cn: "深度态势", en: "Depth" },
  { id: "thermal", cn: "热成像", en: "Thermal" },
  { id: "radio", cn: "无线感知", en: "RF Sensing" },
  { id: "crowd", cn: "人流统计", en: "Occupancy" },
] as const;

export type ChannelId = (typeof CHANNELS)[number]["id"];
