var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// dist/worker.js
import { connect as Se } from "cloudflare:sockets";
var he = Object.defineProperty;
var ge = /* @__PURE__ */ __name((e, t, r) => () => {
  if (r) throw r[0];
  try {
    return e && (t = e(e = 0)), t;
  } catch (n) {
    throw r = [n], n;
  }
}, "ge");
var fe = /* @__PURE__ */ __name((e, t) => {
  for (var r in t) he(e, r, { get: t[r], enumerable: true });
}, "fe");
var B = {};
fe(B, { HARDCODED_SUBTITLES: /* @__PURE__ */ __name(() => xe, "HARDCODED_SUBTITLES") });
var xe;
var W = ge(() => {
  "use strict";
  xe = `WEBVTT

00:00:00.000 --> 00:00:05.000
[Placeholder \u2014 replace with actual demo video subtitles during implementation]

00:00:05.000 --> 00:00:10.000
The actual subtitles should be extracted once from the demo video and hardcoded here.
`;
});
function H(e) {
  let t = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent";
  return { async generateStream(r, n) {
    let s = `${t}?alt=sse&key=${e}`, o = { contents: [{ parts: [{ text: r }] }] };
    n && (o.systemInstruction = { parts: [{ text: n }] });
    let a = await fetch(s, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) });
    if (!a.ok) {
      let i = await a.text();
      throw new Error(`Gemini API error ${a.status}: ${i}`);
    }
    if (!a.body) throw new Error("Gemini API returned no response body");
    return a.body;
  } };
}
__name(H, "H");
var I = /* @__PURE__ */ __name((e) => `session:${e}`, "I");
var G = /* @__PURE__ */ __name((e, t) => `session:${e}:chapter-analysis:${t}`, "G");
function M(e) {
  return { async getSession(t) {
    return await e.get(I(t), "json");
  }, async saveSession(t, r) {
    await e.put(I(t), JSON.stringify(r), { expirationTtl: 604800 });
  }, async updateSession(t, r) {
    let n = await e.get(I(t), "json");
    if (!n) return;
    let s = { ...n, ...r };
    await e.put(I(t), JSON.stringify(s), { expirationTtl: 604800 });
  }, async deleteSession(t) {
    await e.delete(I(t));
  }, async getChapterAnalysis(t, r) {
    return await e.get(G(t, r), "json");
  }, async saveChapterAnalysis(t, r, n) {
    await e.put(G(t, r), JSON.stringify(n), { expirationTtl: 604800 });
  } };
}
__name(M, "M");
function we(e) {
  if (!e.host) throw new Error("Proxy host is required");
  if (!e.port) throw new Error("Proxy port is required");
}
__name(we, "we");
function F(e) {
  return we(e), { async fetch(t, r) {
    let n = new URL(t), o = n.protocol === "https:" ? 443 : 80, a = Se({ hostname: e.host, port: e.port }), i = btoa(`${e.username}:${e.password}`), c = [`CONNECT ${n.hostname}:${o} HTTP/1.1`, `Host: ${n.hostname}:${o}`, `Proxy-Authorization: Basic ${i}`, "", ""].join(`\r
`), l = a.writable.getWriter(), p = new TextEncoder();
    await l.write(p.encode(c));
    let u = a.readable.getReader(), m = new TextDecoder(), d = "";
    for (; ; ) {
      let { value: g, done: A } = await u.read();
      if (A || (d += m.decode(g, { stream: true }), d.includes(`\r
\r
`))) break;
    }
    let w = d.match(/^HTTP\/1\.[01] (\d{3})/);
    if (!w || w[1] !== "200") throw l.releaseLock(), u.releaseLock(), a.close(), new Error(`Proxy CONNECT failed: ${d.split(`\r
`)[0]}`);
    let h = a.startTls(), y = [`${r?.method || "GET"} ${n.pathname}${n.search} HTTP/1.1`, `Host: ${n.hostname}`, "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", "Accept: */*", "Accept-Language: en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7", "Connection: close"];
    if (r?.headers) {
      let g = r.headers;
      for (let [A, de] of Object.entries(g)) ["host", "connection"].includes(A.toLowerCase()) || y.push(`${A}: ${de}`);
    }
    y.push("", "");
    let b = h.writable.getWriter();
    await b.write(p.encode(y.join(`\r
`))), r?.body && await b.write(typeof r.body == "string" ? p.encode(r.body) : new Uint8Array(await r.body)), b.releaseLock();
    let T = h.readable.getReader(), x = [];
    for (; ; ) {
      let { value: g, done: A } = await T.read();
      if (A) break;
      x.push(g);
    }
    T.releaseLock(), h.close(), l.releaseLock(), u.releaseLock();
    let _ = new Uint8Array(x.reduce((g, A) => g + A.length, 0)), E = 0;
    for (let g of x) _.set(g, E), E += g.length;
    return new Response(_);
  } };
}
__name(F, "F");
var ye = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
function V(e) {
  let t = e.match(ye);
  return t ? t[1] : null;
}
__name(V, "V");
function D(e, t) {
  let r = t ? `&lang=${t}` : "";
  return `https://www.youtube.com/api/timedtext?v=${e}${r}&fmt=vtt`;
}
__name(D, "D");
function q(e, t) {
  let r = e.trim(), n = r.length, s = r.length >= 200;
  if (t && r.length > t) {
    let a = r.slice(t).match(/[。！？\n]/), i = a ? t + a.index + 1 : r.length;
    return { ok: s, text: r.slice(0, i), truncated: i < r.length, originalLength: n };
  }
  return { ok: s, text: r, truncated: false, originalLength: n };
}
__name(q, "q");
var U = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var O = [2e3, 5e3];
async function J(e) {
  return new Promise((t) => setTimeout(t, e));
}
__name(J, "J");
async function j(e, t, r, n) {
  if (!n) {
    for (let s = 0; s <= O.length; s++) try {
      s > 0 && await J(O[s - 1]);
      let o = await Ae(e);
      if (o && o.trim().length >= 200) return o;
    } catch {
    }
    for (let s = 0; s <= O.length; s++) try {
      s > 0 && await J(O[s - 1]);
      let o = await Ce(e, t);
      if (o && o.trim().length >= 200) return o;
    } catch {
    }
  }
  if (e === r) {
    let { HARDCODED_SUBTITLES: s } = await Promise.resolve().then(() => (W(), B));
    return s;
  }
  throw new Error("VIDEO_HAS_NO_SUBTITLE");
}
__name(j, "j");
async function Ae(e) {
  let t = await fetch(`https://www.youtube.com/watch?v=${e}`, { headers: { "User-Agent": U, "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7" } });
  if (!t.ok) throw new Error(`YouTube page fetch failed: ${t.status}`);
  let n = (await t.text()).match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
  if (!n) return Y(D(e));
  let o = JSON.parse(n[1])?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (o && o.length > 0) {
    let a = o[0].baseUrl;
    return Y(a);
  }
  throw new Error("No caption tracks found");
}
__name(Ae, "Ae");
async function Y(e) {
  let t = await fetch(e, { headers: { "User-Agent": U } });
  if (!t.ok) throw new Error(`Timedtext fetch failed: ${t.status}`);
  return t.text();
}
__name(Y, "Y");
async function Ce(e, t) {
  let r = D(e), n = await t.fetch(r, { method: "GET", headers: { "User-Agent": U } });
  if (!n.ok) throw new Error(`Proxy timedtext fetch failed: ${n.status}`);
  return n.text();
}
__name(Ce, "Ce");
function K(e) {
  let t = e.proxy, r = e.demoVideoId, n = !!e.skipYoutubeFetch, s = e.maxChars;
  return { parseVideoId(o) {
    return V(o);
  }, async fetchSubtitles(o) {
    return j(o, t, r, n);
  }, validate(o) {
    return q(o, s);
  } };
}
__name(K, "K");
var be = /```[\s\S]*?```/g;
function z(e) {
  let t = [], r = 0, n = e.replace(be, (c) => {
    let l = `\0CODEBLOCK${r}\0`;
    return t.push({ original: c, length: l.length }), r++, l;
  }), s = /(?:^|\n)(?=##\s)/gm, o = n.split(s).filter((c) => c.length > 0);
  if (o.length === 0 || !n.includes("## ")) return [];
  let a = [], i = 0;
  for (let c = 0; c < o.length; c++) {
    let l = o[c];
    l.startsWith(`
`) && (l = l.slice(1)), t.forEach((d, w) => {
      l = l.replace(`\0CODEBLOCK${w}\0`, d.original);
    });
    let p = l.match(/^##\s+(.+?)(?:\n|$)/), u = p ? p[1].trim() : `Section ${c + 1}`, m = l.length;
    a.push({ index: c, title: u, startOffset: i, endOffset: i + m }), i += m, c < o.length - 1 && (i += 1);
  }
  return a;
}
__name(z, "z");
function X(e, t) {
  let r = `\u4F60\u662F\u4E00\u4F4D\u4E13\u4E1A\u7684\u5185\u5BB9\u7F16\u8F91\u3002\u8BF7\u57FA\u4E8E\u4EE5\u4E0B YouTube \u89C6\u9891\u7684\u82F1\u6587\u5B57\u5E55\uFF0C\u751F\u6210\u4E00\u7BC7\u7ED3\u6784\u6E05\u6670\u7684\u4E2D\u6587\u5BF9\u8BDD\u4F53\u6280\u672F\u6587\u7AE0\u3002

\u8981\u6C42\uFF1A
1. \u4F7F\u7528\u5BF9\u8BDD\u4F53\u683C\u5F0F\uFF0C\u8BA9\u6587\u7AE0\u8BFB\u8D77\u6765\u50CF\u662F\u4E00\u573A\u6DF1\u5165\u5BF9\u8BDD
2. \u4F7F\u7528 ## \u6807\u9898\u5212\u5206\u7AE0\u8282\uFF0C\u6BCF\u4E2A\u7AE0\u8282\u805A\u7126\u4E00\u4E2A\u4E3B\u9898
3. \u4FDD\u7559\u539F\u6587\u4E2D\u7684\u5173\u952E\u6570\u636E\u548C\u5F15\u7528
4. \u6587\u7AE0\u5E94\u6613\u4E8E\u4E2D\u6587\u8BFB\u8005\u7406\u89E3\uFF0C\u5FC5\u8981\u65F6\u8865\u5145\u80CC\u666F\u8BF4\u660E
5. \u6BCF\u4E2A\u7AE0\u8282\u5185\u5BB9\u8981\u5145\u5206\u5C55\u5F00\uFF0C\u4E0D\u5C11\u4E8E 300 \u5B57
`;
  return t && t.trim() && (r += `
\u7528\u6237\u7279\u522B\u8981\u6C42\uFF1A${t.trim()}
`), r += `
---
\u5B57\u5E55\u5185\u5BB9\uFF1A

${e}

---

\u8BF7\u5F00\u59CB\u751F\u6210\u6587\u7AE0\uFF1A`, r;
}
__name(X, "X");
function Z(e, t, r) {
  return `\u4F60\u662F\u4E00\u4F4D\u5185\u5BB9\u5206\u6790\u4E13\u5BB6\u3002\u8BF7\u5BF9\u4EE5\u4E0B\u6587\u7AE0\u7AE0\u8282\u8FDB\u884C 5W1H \u5206\u6790\uFF0C\u5E76\u6807\u6CE8\u53EF\u9AD8\u4EAE\u7684\u7EF4\u5EA6\u5173\u952E\u8BCD\u3002

\u89C6\u9891\u6574\u4F53\u80CC\u666F\uFF1A
${r}

\u7AE0\u8282\u6807\u9898\uFF1A${e}
\u7AE0\u8282\u5185\u5BB9\uFF1A
${t}

\u8BF7\u4EE5 JSON \u683C\u5F0F\u8FD4\u56DE\u5206\u6790\u7ED3\u679C\uFF0C\u5305\u542B\uFF1A
1. summary: \u516D\u7EF4\u5EA6\u603B\u7ED3\uFF08who/what/when/where/why/how\uFF09\uFF0C\u6BCF\u4E2A\u7EF4\u5EA6\u7528 1-2 \u53E5\u8BDD
2. highlights: \u7EF4\u5EA6\u7684\u5173\u952E\u8BCD\u53CA\u6240\u5728\u4E0A\u4E0B\u6587\u951A\u70B9\uFF08contextAnchor\uFF09\uFF0C\u7528\u4E8E\u5728\u539F\u6587\u4E2D\u7CBE\u786E\u9AD8\u4EAE

\u8FD4\u56DE\u683C\u5F0F\uFF1A
{
  "summary": {
    "who": "...",
    "what": "...",
    "when": "...",
    "where": "...",
    "why": "...",
    "how": "..."
  },
  "highlights": [
    { "dimension": "who", "phrase": "Elon Musk", "contextAnchor": "Elon Musk announced" },
    { "dimension": "what", "phrase": "AI revolution", "contextAnchor": "the AI revolution is" }
  ]
}`;
}
__name(Z, "Z");
function v() {
  let e = "", t = false, r = new TextEncoder();
  return { transform: new TransformStream({ transform(s, o) {
    let i = new TextDecoder().decode(s).split(`
`);
    for (let c of i) {
      if (!c.startsWith("data: ")) continue;
      let l = c.slice(6).trim();
      if (!(l === "[DONE]" || l === "")) try {
        let u = JSON.parse(l)?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (u) {
          e += u;
          let m = JSON.stringify({ type: "text", text: u });
          o.enqueue(r.encode(`data: ${m}

`));
        }
      } catch {
      }
    }
  }, flush(s) {
    t = true, s.enqueue(r.encode(`data: {"type":"done"}

`));
  } }), getAccumulatedText: /* @__PURE__ */ __name(() => e, "getAccumulatedText"), isComplete: /* @__PURE__ */ __name(() => t, "isComplete") };
}
__name(v, "v");
function Q(e, t, r) {
  let n = X(e, t), s = "You are a professional Chinese technology content editor. Always respond in Chinese. Format your response with ## headings for chapters. Use conversational tone.", o = v();
  return r.generateStream(n, s).then((i) => {
    i.pipeTo(o.transform.writable);
  }).catch((i) => {
    let c = o.transform.writable.getWriter();
    c.write(new TextEncoder().encode(`data: {"type":"error","message":"${i.message}"}

`)), c.close();
  }), { stream: o.transform.readable, getAccumulatedText: o.getAccumulatedText };
}
__name(Q, "Q");
function ee(e) {
  let t = e.generate;
  return { generateStream(r) {
    return Q(r.transcript, r.requirements, t);
  }, async continueStream(r) {
    let n = `\u4EE5\u4E0B\u662F\u5DF2\u751F\u6210\u7684\u6587\u7AE0\u524D\u534A\u90E8\u5206\uFF1A

${r.previousArticle}

\u8BF7\u7EE7\u7EED\u751F\u6210\u6587\u7AE0\u7684\u540E\u7EED\u7AE0\u8282\u3002\u7EF4\u6301\u76F8\u540C\u7684\u5BF9\u8BDD\u4F53\u4E2D\u6587\u98CE\u683C\u548C\u7AE0\u8282\u7ED3\u6784\uFF08## \u6807\u9898\uFF09\u3002

\u5B57\u5E55\u539F\u6587\u4F9B\u53C2\u8003\uFF1A
${r.transcript}`, s = v();
    return (await t.generateStream(n)).pipeTo(s.transform.writable), { stream: s.transform.readable };
  }, parseChapters(r) {
    return z(r);
  } };
}
__name(ee, "ee");
async function te(e, t, r, n) {
  let s = Z(e, t, r);
  return n.generateStream(s, "You are a content analysis expert. Always respond in JSON format with the exact structure requested. Return valid, parseable JSON only.");
}
__name(te, "te");
function re(e) {
  let t = e.generate;
  return { async analyzeChapter(r) {
    return te(r.chapterTitle, r.chapterContent, r.globalContext, t);
  } };
}
__name(re, "re");
function ne(e) {
  let { video: t, article: r, store: n } = e;
  return async (s) => {
    let o = t.parseVideoId(s.url);
    if (!o) throw new Error("INVALID_URL");
    let a;
    try {
      a = await t.fetchSubtitles(o);
    } catch {
      throw new Error("SUBTITLE_FETCH_FAILED");
    }
    let i = t.validate(a);
    if (!i.ok) throw new Error("VIDEO_HAS_NO_SUBTITLE");
    let c = crypto.randomUUID(), { stream: l, getAccumulatedText: p } = r.generateStream({ transcript: i.text, requirements: s.requirements }), { readable: u, writable: m } = new TransformStream(), d = m.getWriter(), w = new TextEncoder();
    d.write(w.encode(`data: {"type":"meta","sessionId":"${c}"}

`));
    let h = l.getReader();
    return (async () => {
      for (; ; ) {
        let { value: T, done: x } = await h.read();
        if (x) break;
        d.write(T);
      }
      d.close();
      let y = p(), b = r.parseChapters(y);
      await n.saveSession(c, { videoUrl: s.url, requirements: s.requirements, transcript: i.text, article: y, chapters: b, createdAt: Date.now(), status: "complete" });
    })(), u;
  };
}
__name(ne, "ne");
function se(e) {
  let { article: t, store: r } = e;
  return async (n) => {
    let s = await r.getSession(n.sessionId);
    if (!s) throw new Error("SESSION_NOT_FOUND");
    let { stream: o } = await t.continueStream({ transcript: s.transcript, previousArticle: s.article }), { readable: a, writable: i } = new TransformStream(), c = i.getWriter(), l = o.getReader(), p = "";
    return (async () => {
      for (; ; ) {
        let { value: m, done: d } = await l.read();
        if (d) break;
        c.write(m);
        let h = new TextDecoder().decode(m).match(/"text":"((?:[^"\\]|\\.)*)"/);
        h && (p += JSON.parse(`"${h[1]}"`));
      }
      c.close(), await r.updateSession(n.sessionId, { article: s.article + p, chapters: t.parseChapters(s.article + p), status: "complete" });
    })(), a;
  };
}
__name(se, "se");
function oe(e) {
  let { analysis: t, store: r } = e;
  return async (n) => {
    let s = await r.getChapterAnalysis(n.sessionId, n.chapterIndex);
    if (s) return s;
    let o = await r.getSession(n.sessionId);
    if (!o) throw new Error("SESSION_NOT_FOUND");
    let a = o.chapters[n.chapterIndex];
    if (!a) throw new Error("CHAPTER_NOT_FOUND");
    let i = o.article.slice(a.startOffset, a.endOffset), c = o.chapters.map((C) => `- ${C.title}`).join(`
`), p = (await t.analyzeChapter({ chapterTitle: a.title, chapterContent: i, globalContext: c })).getReader(), u = new TextDecoder(), m = "";
    for (; ; ) {
      let { value: C, done: y } = await p.read();
      if (y) break;
      if (C) {
        let T = u.decode(C, { stream: true }).split(`
`);
        for (let x of T) if (x.startsWith("data: ")) try {
          let E = JSON.parse(x.slice(6))?.candidates?.[0]?.content?.parts?.[0]?.text;
          E && (m += E);
        } catch {
        }
      }
    }
    let w = m.trim().replace(/^```json\s*/i, "").replace(/\s*```$/i, ""), h = JSON.parse(w);
    return await r.saveChapterAnalysis(n.sessionId, n.chapterIndex, h), h;
  };
}
__name(oe, "oe");
function ae(e) {
  let t = M(e.KV_STORE), r = H(e.GEMINI_API_KEY), n;
  if (e.WEBSHARE_CONFIG) {
    let c = JSON.parse(e.WEBSHARE_CONFIG);
    n = { host: c.host || "proxy.webshare.io", port: c.port || 443, username: c.username || "", password: c.password || "" };
  }
  let s = F(n || { host: "proxy.webshare.io", port: 443, username: "", password: "" }), o = K({ proxy: s, demoVideoId: e.DEMO_VIDEO_ID, skipYoutubeFetch: e.SKIP_YOUTUBE_FETCH === "true", maxChars: e.MAX_CHARS ? parseInt(e.MAX_CHARS) : 15e4 }), a = ee({ generate: r }), i = re({ generate: r });
  return { createSession: ne({ video: o, article: a, store: t }), continueSession: se({ article: a, store: t }), getChapterAnalysis: oe({ analysis: i, store: t }), getSession: /* @__PURE__ */ __name((c) => t.getSession(c), "getSession") };
}
__name(ae, "ae");
function ie() {
  let e = [];
  return { add(t, r, n) {
    e.push({ method: t.toUpperCase(), pattern: new URLPattern({ pathname: r }), handler: n });
  }, async handle(t) {
    for (let r of e) {
      if (r.method !== t.method) continue;
      let n = r.pattern.exec(t.url);
      if (n) {
        let s = n.pathname.groups;
        return r.handler(t, ...Object.values(s));
      }
    }
    return null;
  } };
}
__name(ie, "ie");
function P(e) {
  return e.json();
}
__name(P, "P");
function k(e) {
  return new Response(e, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "Access-Control-Allow-Origin": "*" } });
}
__name(k, "k");
function R(e, t = 200) {
  return new Response(JSON.stringify(e), { status: t, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
}
__name(R, "R");
function f(e) {
  return R(e.toJSON(), e.status);
}
__name(f, "f");
function ce() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}
__name(ce, "ce");
var S = class extends Error {
  static {
    __name(this, "S");
  }
  constructor(r, n, s) {
    super(s);
    this.code = r;
    this.status = n;
    this.name = "AppError";
  }
  code;
  status;
  toJSON() {
    return { error: this.code, message: this.message };
  }
};
function L() {
  return new S("INVALID_URL", 400, "\u4E0D\u662F\u6709\u6548\u7684 YouTube \u94FE\u63A5");
}
__name(L, "L");
function le() {
  return new S("VIDEO_HAS_NO_SUBTITLE", 422, "\u8BE5\u89C6\u9891\u6CA1\u6709\u53EF\u7528\u7684\u5B57\u5E55");
}
__name(le, "le");
function pe() {
  return new S("SUBTITLE_FETCH_FAILED", 503, "\u5B57\u5E55\u83B7\u53D6\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
}
__name(pe, "pe");
function $() {
  return new S("SESSION_NOT_FOUND", 404, "\u4F1A\u8BDD\u4E0D\u5B58\u5728\u6216\u5DF2\u8FC7\u671F");
}
__name($, "$");
function ue() {
  return new S("CHAPTER_NOT_FOUND", 404, "\u7AE0\u8282\u4E0D\u5B58\u5728");
}
__name(ue, "ue");
function me(e) {
  return new S("GEMINI_API_ERROR", 502, e);
}
__name(me, "me");
var At = { async fetch(e, t) {
  if (e.method === "OPTIONS") return ce();
  let r = ae(t), n = ie();
  n.add("POST", "/create", async (o) => {
    try {
      let a = await P(o);
      if (!a.url) return f(L());
      let i = await r.createSession(a);
      return k(i);
    } catch (a) {
      return N(a);
    }
  }), n.add("POST", "/continue", async (o) => {
    try {
      let a = await P(o), i = await r.continueSession(a);
      return k(i);
    } catch (a) {
      return N(a);
    }
  }), n.add("POST", "/chapter-analysis", async (o) => {
    try {
      let a = await P(o), i = await r.getChapterAnalysis(a);
      return R(i);
    } catch (a) {
      return N(a);
    }
  }), n.add("GET", "/session/:id", async (o, a) => {
    try {
      let i = await r.getSession(a);
      return i ? R(i) : f($());
    } catch (i) {
      return N(i);
    }
  });
  let s = await n.handle(e);
  return s || R({ error: "NOT_FOUND", message: "Route not found" }, 404);
} };
function N(e) {
  if (e instanceof S) return f(e);
  let t = e instanceof Error ? e.message : "Internal error";
  switch (t) {
    case "INVALID_URL":
      return f(L());
    case "VIDEO_HAS_NO_SUBTITLE":
      return f(le());
    case "SUBTITLE_FETCH_FAILED":
      return f(pe());
    case "SESSION_NOT_FOUND":
      return f($());
    case "CHAPTER_NOT_FOUND":
      return f(ue());
    default:
      return f(me(t));
  }
}
__name(N, "N");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-0Zi4Y9/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = At;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-0Zi4Y9/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
