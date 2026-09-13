/**
 * 브라우저 회귀 검사 (설치된 Chrome 사용, 브라우저 다운로드 없음).
 *
 *   npm run build && node scripts/visual-check.mjs            # vite preview 를 띄워 검사
 *   BASE_URL=http://localhost:5173 node scripts/visual-check.mjs  # 이미 떠 있는 서버 검사
 *
 * 검사 항목 (데스크톱 1366×800, 태블릿 820×1100 각각)
 *  1. 3D Stage 의 WebGL 컨텍스트가 살아 있다 (Context Lost 회귀)
 *  2. 달 위상 음력 3일: Dock 의 2D 달 캔버스 오른쪽이 밝고 왼쪽이 어둡다 (명암 반전 회귀)
 *  3. Stage / Inspector / Dock 영역이 서로 겹치지 않는다 (레이아웃 회귀)
 *  4. 6-2 네 탭이 각각 svg 또는 살아있는 canvas 를 그린다
 * 스크린샷은 .playwright-mcp/visual/ 에 남긴다 (gitignore).
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = '.playwright-mcp/visual';
mkdirSync(OUT, { recursive: true });

let server = null;
let base = process.env.BASE_URL;
if (!base) {
    base = 'http://localhost:4199';
    server = spawn('npx', ['vite', 'preview', '--port', '4199', '--strictPort'], { shell: true, stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 2500));
}

const failures = [];
const ok = (cond, msg) => { if (!cond) failures.push(msg); console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); };

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });

async function dismiss(page) {
    for (const t of ['건너뛰기', '학습 시작하기']) {
        const b = page.getByRole('button', { name: t });
        if (await b.count()) await b.first().click().catch(() => {});
    }
}
async function contextAlive(page) {
    return page.evaluate(() => {
        const c = document.querySelector('.sim-stage canvas');
        if (!c) return 'no-canvas';
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        return gl ? !gl.isContextLost() : 'no-gl';
    });
}
async function rectsDisjoint(page) {
    return page.evaluate(() => {
        const r = (s) => document.querySelector(s)?.getBoundingClientRect();
        const a = r('.sim-stage'), b = r('.sim-inspector'), d = r('.sim-dock');
        if (!a || !b || !d) return false;
        const hit = (p, q) => p && q && p.left < q.right - 1 && q.left < p.right - 1 && p.top < q.bottom - 1 && q.top < p.bottom - 1;
        return !hit(a, b) && !hit(a, d) && !hit(b, d);
    });
}

for (const vp of [{ name: 'desktop', width: 1366, height: 800 }, { name: 'tablet', width: 820, height: 1100 }]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

    // 1·2·3: 달 위상
    await page.goto(`${base}/grade4-moon-solar`);
    await page.waitForTimeout(3000);
    await dismiss(page);
    await page.waitForTimeout(1200);
    ok((await contextAlive(page)) === true, `[${vp.name}] 달 위상 3D 컨텍스트 생존`);
    ok(await rectsDisjoint(page), `[${vp.name}] Stage/Inspector/Dock 비겹침`);
    const slider = page.locator('.sim-dock input[type=range]').first();
    await slider.evaluate((el, v) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(2 / 29.5));
    await page.waitForTimeout(300);
    const lum = await page.evaluate(() => {
        const c = document.querySelector('.sim-dock canvas');
        const ctx = c.getContext('2d');
        const cx = c.width / 2, cy = c.height / 2, r = c.width / 2 - 8;
        const L = (x) => { const p = ctx.getImageData(Math.round(x), Math.round(cy), 1, 1).data; return (p[0] + p[1] + p[2]) / 3; };
        return { right: L(cx + r * 0.9), left: L(cx - r * 0.7) };
    });
    ok(lum.right > 120 && lum.left < 80, `[${vp.name}] 음력 3일 오른쪽 밝음(${lum.right | 0}) 왼쪽 어둠(${lum.left | 0})`);
    await page.screenshot({ path: `${OUT}/${vp.name}-moon.png` });

    // 4: 6-2 네 탭
    await page.goto(`${base}/grade6-season`);
    await page.waitForTimeout(2500);
    await dismiss(page);
    for (const tab of ['하루 태양 고도', '계절별 남중 고도', '에너지 밀도', '자전축']) {
        await page.getByRole('button', { name: new RegExp(tab) }).first().click();
        await page.waitForTimeout(1800);
        const kind = await page.evaluate(() => document.querySelector('.sim-stage svg') ? 'svg' : (document.querySelector('.sim-stage canvas') ? 'canvas' : 'none'));
        const alive = kind === 'svg' ? true : (await contextAlive(page)) === true;
        ok(alive, `[${vp.name}] 6-2 ${tab}: ${kind} 렌더`);
        ok(await rectsDisjoint(page), `[${vp.name}] 6-2 ${tab}: 비겹침`);
        await page.screenshot({ path: `${OUT}/${vp.name}-g6-${tab.replace(/\s+/g, '')}.png` });
    }
    await page.close();
}

await browser.close();
if (server) server.kill();
console.log(failures.length ? `\n${failures.length} FAIL` : '\nALL PASS');
process.exit(failures.length ? 1 : 0);
