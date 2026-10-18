import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(process.env.DEMO_URL || "http://127.0.0.1:4173/");
await page.getByRole("heading", { name: "A decision for Monday" }).waitFor();
await page.getByRole("button", { name: /Read the visitor survey/ }).click();
await page.reload();
await page.getByRole("heading", { name: "A very confident survey" }).waitFor();
await page.getByRole("button", { name: /Examine the claim/ }).click();
await page.getByRole("button", { name: /It describes respondents/ }).click();
await page.getByRole("status").waitFor();
await page.getByRole("button", { name: "Continue →" }).click();
await page.getByRole("button", { name: /cause remains uncertain/ }).click();
await page.getByRole("button", { name: "Continue →" }).click();
await page.getByRole("button", { name: /Pilot both options/ }).click();
await page.getByRole("button", { name: "Continue →" }).click();
assert.match(
  await page.locator(".feedback").innerText(),
  /3\/3 first answers correct/,
);
await page.reload();
await page.getByRole("button", { name: /Start a fresh session/ }).click();
await page.getByRole("heading", { name: "A decision for Monday" }).waitFor();
await page
  .locator("input[type=file]")
  .setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
await page.getByRole("alert").waitFor();
await page.getByRole("heading", { name: "A decision for Monday" }).waitFor();
await page.getByRole("button", { name: "Load original demo" }).click();
if (process.env.SCREENSHOT_PATH)
  await page.screenshot({ path: process.env.SCREENSHOT_PATH, fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  true,
);
await page.getByRole("button", { name: /Inspect attendance records/ }).click();
await page
  .getByRole("heading", { name: "The numbers tell a story — but which one?" })
  .waitFor();
assert.deepEqual(errors, []);
console.log(
  "Browser smoke passed: branching, feedback, completion, reload, reset, invalid upload, mobile width; no page exceptions.",
);
await browser.close();
