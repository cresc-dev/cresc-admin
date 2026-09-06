// 从 src/assets/logo.svg 生成 public/icons 下的位图。一次性脚本，不进构建，
// 所以 playwright 不在 dependencies 里——跑之前先 `bun add -d playwright`，
// 或用全局装的那份。
//
//   node scripts/render-icons.mjs
//
// 为什么不直接引 SVG：这几张的宿主（iOS 主屏、Android launcher、邮件客户端）
// 都只吃位图。邮件那张尤其——Gmail、Outlook 和多数网页端邮箱不渲染 img 里的
// SVG，引 SVG 的话 cresc-go 发出去的信里 logo 位置会是一张破图。
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mark = readFileSync(resolve(root, "src/assets/logo.svg"), "utf8");

const targets = [
  // 白底 + 缩到 70% 不是审美选择：iOS 会把 apple-touch-icon 的透明区域合成成
  // 黑色，maskable 裁切后露出的也是背景，两处都需要不透明底（对齐 manifest
  // 的 background_color）；70% 让月牙落在 maskable 的安全区（画布中心 80% 的
  // 圆）内，裁圆角切不到。
  { out: "public/icons/apple-touch-icon.png", size: 180 },
  { out: "public/icons/icon-192.png", size: 192 },
  { out: "public/icons/icon-512.png", size: 512 },
  // 邮件 logo 反过来：透明底铺满画布。它显示在 cresc-go 邮件模板的白色页头里,
  // 不经过任何裁切，96px 是模板里 44px 显示尺寸的两倍多，高分屏下不糊。
  { out: "public/icons/mail-logo-96.png", size: 96, background: "transparent", scale: 1 },
];

const browser = await chromium.launch();
for (const { out, size, background = "#ffffff", scale = 0.7 } of targets) {
  const transparent = background === "transparent";
  const drawn = Math.round(size * scale);
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>
       html,body{margin:0;padding:0;background:${background}}
       .wrap{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center}
       svg{display:block;width:${drawn}px;height:${drawn}px}
     </style>
     <div class="wrap">${mark}</div>`,
  );
  writeFileSync(resolve(root, out), await page.screenshot({ omitBackground: transparent }));
  await page.close();
  console.log(`${out} ${size}x${size}`);
}
await browser.close();
