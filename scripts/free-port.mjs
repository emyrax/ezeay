import { execSync } from "node:child_process";

const PORT = Number(process.argv[2] ?? "3001");

let pids = [];
try {
  const out = execSync(
    `netstat -ano -p tcp | findstr "LISTENING"`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
  );
  pids = out
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)$/))
    .filter((match) => match && Number(match[1]) === PORT)
    .map((match) => match[2]);
} catch {
  pids = [];
}

if (pids.length === 0) {
  console.log(`[free-port] port ${PORT} is free`);
} else {
  for (const pid of [...new Set(pids)]) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      console.log(`[free-port] killed pid ${pid} (port ${PORT})`);
    } catch {
      console.error(`[free-port] could not kill pid ${pid}`);
    }
  }
}