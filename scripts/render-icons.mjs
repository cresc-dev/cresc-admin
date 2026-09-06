// 从 SVG 源生成 public/icons 下的位图。一次性脚本，不进构建，所以 playwright
// 不在 dependencies 里——跑之前先 `bun add -d playwright`，或用全局装的那份。
//
//   node scripts/render-icons.mjs
//
// 为什么不直接在页面里引 SVG：这几张是 apple-touch-icon、PWA manifest 图标和
// 邮件 logo，宿主（iOS、Android launcher、邮件客户端）都只吃位图。
//
// 白底不是随手加的：iOS 会把 apple-touch-icon 的透明区域合成成黑色，maskable
// 图标裁切后露出的也是背景，两处都需要不透明底，和 manifest 的
// background_color (#ffffff) 对齐。0.70 的缩放让月牙落在 maskable 的安全区
// （画布中心 80% 的圆）里，裁圆角后不会被切到。
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const consoleMark = resolve(root, "src/assets/logo.svg");

const targets = [
  { svg: consoleMark, out: "public/icons/apple-touch-icon.png", size: 180 },
  { svg: consoleMark, out: "public/icons/icon-192.png", size: 192 },
  { svg: consoleMark, out: "public/icons/icon-512.png", size: 512 },
  // 邮件 logo 是金色那版（cresc.dev 的品牌标），配 cresc-go 邮件模板里
  // #7c5c35 的 brand 色，故意和控制台的蓝色月牙不同。改之前先看
  // cresc-go 的 internal/mailtemplates/_emails/assets/README.md。
  {
    svg: resolve(root, "src/assets/mail-logo.svg"),
    out: "public/icons/mail-logo-96.png",
    size: 96,
    background: "transparent",
  },
];

const browser = await chromium.launch();
for (const { svg, out, size, background = "#ffffff", scale = 0.7 } of targets) {
  const transparent = background === "transparent";
  // 邮件 logo 铺满画布：它显示在白底邮件头里，不需要 maskable 的安全区。
  const mark = Math.round(size * (transparent ? 1 : scale));
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>
       html,body{margin:0;padding:0;background:${background}}
       .wrap{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center}
       svg{display:block;width:${mark}px;height:${mark}px}
     </style>
     <div class="wrap">${readFileSync(svg, "utf8")}</div>`,
  );
  writeFileSync(resolve(root, out), await page.screenshot({ omitBackground: transparent }));
  await page.close();
  console.log(`${out} ${size}x${size}`);
}
await browser.close();
