import fs from "node:fs";
import path from "node:path";
import { getPageMeta, getListsOfRiwaya } from "quran-meta";

const hafsData = getListsOfRiwaya("Hafs");
const data: Record<string, { start: string, end: string }> = {};

for (let page = 1; page <= 604; page++) {
  const meta = getPageMeta(page as any, hafsData);

  data[page.toString()] = {
    start: `${meta.first[0]}:${meta.first[1]}`,
    end: `${meta.last[0]}:${meta.last[1]}`,
  };
}

const targetFile = path.join(process.cwd(), "src/lib/page-data.json");
fs.writeFileSync(
  targetFile,
  JSON.stringify(data, null, 2),
);

console.log("Generated:", targetFile);
