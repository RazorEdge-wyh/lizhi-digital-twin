// Diagnostics helper: drives headless Chrome over CDP to inspect the live page.
// Not part of the deployed site.
import { spawn } from "node:child_process";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL_TARGET = process.argv[2] ?? "http://127.0.0.1:4173/";
const WIDTH = Number(process.argv[3] ?? 1600);
const HEIGHT = Number(process.argv[4] ?? 900);
const EXPR = process.argv[5] ?? "1+1";
// optional sixth argument: --shot=<path> captures a screenshot after EXPR runs
const SHOT = (process.argv[6] ?? "").replace(/^--shot=/, "");
const PORT = 9333;

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    "--no-first-run",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--user-data-dir=" + process.env.TEMP + "\\cdp-profile-" + Date.now(),
    URL_TARGET,
  ],
  { stdio: "ignore", detached: false },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findPage() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error("no debuggable page found");
}

const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();

ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

const send = (method, params = {}) =>
  new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

await new Promise((resolve) => ws.addEventListener("open", resolve));
await send("Runtime.enable");
await sleep(2500); // let fonts, art and the app mount settle

const result = await send("Runtime.evaluate", {
  expression: EXPR,
  returnByValue: true,
  awaitPromise: true,
});
console.log(JSON.stringify(result.result?.result?.value ?? result.result, null, 2));

if (SHOT) {
  await sleep(1600); // let the view transition settle before capturing
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const data = shot.result?.data;
  if (data) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(SHOT, Buffer.from(data, "base64"));
    console.log(`screenshot -> ${SHOT}`);
  } else {
    console.log("screenshot failed:", JSON.stringify(shot).slice(0, 200));
  }
}

ws.close();
chrome.kill();
process.exit(0);
