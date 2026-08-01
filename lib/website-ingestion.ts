import "server-only";
import dns from "node:dns/promises";
import net from "node:net";

export interface WebsitePage { url:string; title:string; text:string; }
const MAX_PAGES=8, MAX_TEXT=120_000, TIMEOUT_MS=8_000;
const useful=/(about|services?|industr(?:y|ies)|team|people|leadership|careers?|jobs?|contact|locations?|pricing|faq|frequently|blog)/i;
const blocked=/(login|log-in|signin|sign-in|account|portal|auth|admin|checkout|cart)/i;

function privateIp(address:string) {
  if (address === "::1" || address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) return true;
  if (!net.isIPv4(address)) return false;
  const [a,b]=address.split(".").map(Number);
  return a===10 || a===127 || a===0 || (a===169&&b===254) || (a===172&&b>=16&&b<=31) || (a===192&&b===168);
}
async function assertPublic(url:URL) {
  if (!['http:','https:'].includes(url.protocol)) throw new Error("Only public HTTP or HTTPS websites are supported.");
  if (url.username || url.password || url.hostname === "localhost" || url.hostname.endsWith(".local")) throw new Error("Private or authenticated URLs are not supported.");
  const addresses=await dns.lookup(url.hostname,{all:true});
  if (!addresses.length || addresses.some((item)=>privateIp(item.address))) throw new Error("The URL does not resolve to a public website.");
}
const decode=(text:string)=>text.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
function extract(html:string,url:URL) {
  const title=decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g," ") ?? "").trim();
  const description=decode(html.match(/<meta[^>]+(?:name=["']description["'][^>]+content=["']([^"']+)|content=["']([^"']+)["'][^>]+name=["']description["'])/i)?.slice(1).find(Boolean) ?? "");
  const cleaned=html.replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi," ").replace(/<!--([\s\S]*?)-->/g," ").replace(/<[^>]+>/g," ");
  const text=decode(`${description} ${cleaned}`).replace(/\s+/g," ").trim().slice(0,MAX_TEXT);
  const links=[...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["']/gi)].map((match)=>{try{return new URL(match[1],url)}catch{return null}}).filter((item):item is URL=>Boolean(item && item.origin===url.origin && useful.test(item.pathname) && !blocked.test(item.pathname)));
  return {page:{url:url.href,title,text},links};
}
async function fetchHtml(url:URL) {
  await assertPublic(url);
  const response=await fetch(url,{redirect:"follow",signal:AbortSignal.timeout(TIMEOUT_MS),headers:{"User-Agent":"AI-Roadmap-Discovery/1.0 (+public assessment crawler)",Accept:"text/html"}});
  if (!response.ok) throw new Error(`Website returned HTTP ${response.status}.`);
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) throw new Error("The URL did not return an HTML page.");
  const finalUrl=new URL(response.url); await assertPublic(finalUrl);
  return {html:(await response.text()).slice(0,1_000_000),url:finalUrl};
}
function robotsAllows(robots:string,path:string) {
  let applies=false;
  for (const raw of robots.split(/\r?\n/)) { const line=raw.split("#")[0].trim(); const [key,...rest]=line.split(":"); const value=rest.join(":").trim(); if (key?.toLowerCase()==="user-agent") applies=value==="*"; if (applies && key?.toLowerCase()==="disallow" && value && path.startsWith(value)) return false; }
  return true;
}
export async function crawlWebsite(input:string) {
  const normalized=/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`; const root=new URL(normalized); await assertPublic(root);
  let robots=""; try { const response=await fetch(new URL("/robots.txt",root),{signal:AbortSignal.timeout(4_000),headers:{"User-Agent":"AI-Roadmap-Discovery/1.0"}}); if (response.ok) robots=await response.text(); } catch {}
  if (!robotsAllows(robots,root.pathname)) throw new Error("The website's robots rules do not permit this page to be fetched.");
  const home=await fetchHtml(root); const extracted=extract(home.html,home.url); const pages=[extracted.page]; const seen=new Set([home.url.href]);
  for (const link of extracted.links) { if (pages.length>=MAX_PAGES) break; link.hash=""; if (seen.has(link.href) || !robotsAllows(robots,link.pathname)) continue; seen.add(link.href); try { const result=await fetchHtml(link); pages.push(extract(result.html,result.url).page); } catch {} }
  return {pages,sourceUrls:pages.map((page)=>page.url)};
}
