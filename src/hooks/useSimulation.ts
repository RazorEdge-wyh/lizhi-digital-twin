/**
 * Deterministic simulation of the building's sensor fabric.
 *
 * Values are seeded so a reload behaves identically, and every derived number
 * (status, PMV, totals) comes from the same generator -- so the hierarchy,
 * status bar and monitor never contradict each other.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FLOORS, FLOOR_BASE, type SensorReading, type ZoneStatus } from "../data/building";

const TICK_MS = 2400;
const HISTORY = 72;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function classify(r: Omit<SensorReading, "status">): ZoneStatus {
  if (r.co2 > 1050 || r.temp > 27.5 || (r.db > 68 && r.people > 20)) return "alert";
  if (r.co2 > 880 || r.temp > 25.6 || Math.abs(r.pmv) > 0.72 || r.rh > 62) return "warn";
  return "ok";
}

function pmvOf(temp: number, rh: number): number {
  // Simplified Fanger-style surrogate: drifts with temperature, tempered by RH.
  return (temp - 23.2) * 0.31 + (rh - 47) * 0.012;
}

function step(prev: SensorReading, rand: () => number, i: number): SensorReading {
  const base = FLOOR_BASE[i] ?? FLOOR_BASE[0];
  const hour = new Date().getHours();
  const occupied = hour >= 7 && hour <= 22;

  const pull = (v: number, target: number, k: number) => v + (target - v) * k;

  const people = Math.max(
    0,
    Math.round(pull(prev.people, occupied ? base.people : base.people * 0.12, 0.08) + (rand() - 0.5) * base.people * 0.07),
  );
  const co2Load = (people / Math.max(1, base.people)) * 340;
  const co2 = Math.round(
    Math.max(415, Math.min(1650, pull(prev.co2, 460 + co2Load, 0.14) + (rand() - 0.5) * 26)),
  );
  const temp = Math.max(
    16.5,
    Math.min(31, pull(prev.temp, base.temp + (people / Math.max(1, base.people)) * 0.9, 0.06) + (rand() - 0.5) * 0.22),
  );
  const rh = Math.max(28, Math.min(72, pull(prev.rh, base.rh + (rand() - 0.5) * 6, 0.05)));
  const power = Math.max(
    4,
    pull(prev.power, base.power * (occupied ? 1 : 0.55) + people * 0.11, 0.1) + (rand() - 0.5) * 4,
  );
  const lux = Math.max(60, pull(prev.lux, base.lux * (occupied ? 1 : 0.35) + (rand() - 0.5) * 40, 0.12));
  const db = Math.max(32, Math.min(82, pull(prev.db, base.db + (people / Math.max(1, base.people)) * 6, 0.1) + (rand() - 0.5) * 1.2));
  const online = Math.max(base.devices - 9, Math.min(base.devices, Math.round(prev.online + (rand() - 0.45) * 2)));

  const partial = { temp, rh, co2, people, power, pv: prev.pv, lux, db, devices: base.devices, online, pmv: pmvOf(temp, rh) };
  return { ...partial, status: classify(partial) };
}

export interface SimState {
  readings: Record<string, SensorReading>;
  history: Record<string, number[]>;
  /** aggregate electrical load of the whole building, kW */
  load: number;
  /** aggregate PV generation, kW */
  pv: number;
  /** people counted across monitored floors */
  people: number;
  /** mean PMV across monitored floors */
  pmv: number;
  /** total endpoints / reporting endpoints */
  devices: number;
  online: number;
  alerts: number;
  warns: number;
  tick: number;
}

function initialState(): SimState {
  const readings: Record<string, SensorReading> = {};
  const history: Record<string, number[]> = {};
  FLOORS.forEach((floor, i) => {
    const rand = mulberry32(1337 + i * 977);
    const base = FLOOR_BASE[i] ?? FLOOR_BASE[0];
    const series: number[] = [];
    const r: Omit<SensorReading, "status"> = {
      temp: base.temp,
      rh: base.rh,
      co2: base.co2,
      people: base.people,
      power: base.power,
      pv: 0,
      lux: base.lux,
      db: base.db,
      devices: base.devices,
      online: base.devices - Math.floor(rand() * 5),
      pmv: pmvOf(base.temp, base.rh),
    };
    for (let t = 0; t < HISTORY; t++) {
      series.push(+(r.temp + Math.sin(t / 5.2 + i) * 0.55 + (rand() - 0.5) * 0.3).toFixed(2));
    }
    series[series.length - 1] = +r.temp.toFixed(2);
    readings[floor.id] = { ...r, status: classify(r) };
    history[floor.id] = series;
  });
  return aggregate(readings, history, 0);
}

function aggregate(
  readings: Record<string, SensorReading>,
  history: Record<string, number[]>,
  tick: number,
): SimState {
  const list = Object.values(readings);
  const pv = 0; // PV figures arrive with the rooftop array; kept at 0 for now.
  const load = list.reduce((s, r) => s + r.power, 0);
  const people = list.reduce((s, r) => s + r.people, 0);
  const pmv = list.reduce((s, r) => s + r.pmv, 0) / Math.max(1, list.length);
  const devices = list.reduce((s, r) => s + r.devices, 0);
  const online = list.reduce((s, r) => s + r.online, 0);
  return {
    readings,
    history,
    load,
    pv,
    people,
    pmv,
    devices,
    online,
    alerts: list.filter((r) => r.status === "alert").length,
    warns: list.filter((r) => r.status === "warn").length,
    tick,
  };
}

export function useBuildingSimulation(paused: boolean) {
  const [state, setState] = useState<SimState>(initialState);
  const randRef = useRef(mulberry32(90210));

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setState((prev) => {
        const readings: Record<string, SensorReading> = {};
        const history: Record<string, number[]> = {};
        FLOORS.forEach((floor, i) => {
          const before = prev.readings[floor.id];
          if (!before) return;
          const next = step(before, randRef.current, i);
          readings[floor.id] = next;
          const series = (prev.history[floor.id] ?? []).concat(next.temp);
          history[floor.id] = series.slice(-HISTORY);
        });
        return aggregate(readings, history, prev.tick + 1);
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return state;
}

/** Isolated random walk for decorative widgets (sparkline jitter, feed noise). */
export function useNoise(seed: number, length: number, range: number) {
  const rand = useMemo(() => mulberry32(seed), [seed]);
  return useMemo(() => Array.from({ length }, () => rand() * range), [rand, length, range]);
}

export function useInterval(callback: () => void, ms: number, enabled = true) {
  const cb = useRef(callback);
  cb.current = callback;
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => cb.current(), ms);
    return () => window.clearInterval(id);
  }, [ms, enabled]);
}

/** Click-outside helper for the menu bar dropdowns. */
export function useDismiss<T extends HTMLElement>(open: boolean, onDismiss: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onDismiss]);
  return { ref, close: useCallback(() => onDismiss(), [onDismiss]) };
}
