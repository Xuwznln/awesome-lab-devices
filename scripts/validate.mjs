#!/usr/bin/env node
// 校验 index.json：不依赖第三方包，检查 schema.json 里约定的必填项 / 格式 / 唯一性。
// 用法：node scripts/validate.mjs [index.json]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2] ? resolve(process.argv[2]) : resolve(root, "index.json");
const errors = [];
const fail = (msg) => errors.push(msg);

let index;
try {
  index = JSON.parse(readFileSync(file, "utf8"));
} catch (error) {
  console.error(`无法读取 / 解析 ${file}: ${error.message}`);
  process.exit(1);
}

if (index.schema !== "awesome-lab-devices/v1") fail(`schema 必须是 "awesome-lab-devices/v1"，当前 ${JSON.stringify(index.schema)}`);
if (index.updated_at && !/^\d{4}-\d{2}-\d{2}$/.test(index.updated_at)) fail(`updated_at 应为 YYYY-MM-DD，当前 ${index.updated_at}`);
if (!Array.isArray(index.packages)) fail("packages 必须是数组");

const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DEVICE = /^[A-Za-z0-9_.-]+$/;
const CATEGORIES = new Set(["demo", "device", "workstation", "resource", "integration"]);
const normalize = (name) => String(name).trim().toLowerCase().replace(/-/g, "_");
const seen = new Map();

for (const [i, pkg] of (index.packages ?? []).entries()) {
  const where = `packages[${i}]${pkg?.name ? ` (${pkg.name})` : ""}`;
  if (typeof pkg !== "object" || pkg === null) {
    fail(`${where} 必须是对象`);
    continue;
  }
  for (const key of ["name", "spec", "description"]) {
    if (typeof pkg[key] !== "string" || !pkg[key].trim()) fail(`${where}.${key} 必填且非空`);
  }
  if (typeof pkg.name === "string" && !NAME.test(pkg.name)) fail(`${where}.name 不是合法分发名`);
  if (typeof pkg.name === "string") {
    const key = normalize(pkg.name);
    if (seen.has(key)) fail(`${where}.name 与 packages[${seen.get(key)}] 重复（-/_ 与大小写视为相同）`);
    seen.set(key, i);
  }
  if (typeof pkg.spec === "string") {
    const spec = pkg.spec.trim();
    const looksLocal = /^([A-Za-z]:[\\/]|\.{1,2}[\\/]|\/|~|file:)/.test(spec);
    if (looksLocal) fail(`${where}.spec 不能是本地路径：${spec}`);
    if (/\s/.test(spec)) fail(`${where}.spec 含空白字符`);
    if (spec.startsWith("git+") && !/^git\+https?:\/\//.test(spec)) fail(`${where}.spec git 规格应为 git+https://…`);
  }
  if (!Array.isArray(pkg.devices)) fail(`${where}.devices 必须是数组（可为空）`);
  else for (const d of pkg.devices) if (typeof d !== "string" || !DEVICE.test(d)) fail(`${where}.devices 含非法设备 id ${JSON.stringify(d)}`);
  if (pkg.tags !== undefined && (!Array.isArray(pkg.tags) || pkg.tags.some((t) => typeof t !== "string"))) fail(`${where}.tags 必须是字符串数组`);
  if (pkg.official !== undefined && typeof pkg.official !== "boolean") fail(`${where}.official 必须是布尔`);
  if (pkg.category !== undefined && !CATEGORIES.has(pkg.category)) fail(`${where}.category 只能是 ${[...CATEGORIES].join(" / ")}`);
  for (const key of ["homepage"]) {
    if (pkg[key] !== undefined && !/^https?:\/\//.test(pkg[key])) fail(`${where}.${key} 应为 http(s) 地址`);
  }
}

if (errors.length) {
  console.error(`index.json 校验失败（${errors.length} 处）：`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`OK  ${index.packages.length} packages, ${index.packages.reduce((n, p) => n + p.devices.length, 0)} devices`);
