import { NextResponse } from "next/server";
import { crawlWebsite } from "@/lib/website-ingestion";
import { analyzeWebsite } from "@/lib/website-analysis";

export const runtime="nodejs";
export async function POST(request:Request) {
  try { const body=await request.json() as {url?:unknown}; if (typeof body.url!=="string" || !body.url.trim() || body.url.length>2048) return NextResponse.json({error:"Enter a valid public website URL."},{status:400}); const crawl=await crawlWebsite(body.url); return NextResponse.json({...crawl,analysis:analyzeWebsite(crawl.pages)}); }
  catch (error) { return NextResponse.json({error:error instanceof Error ? error.message : "Website analysis failed."},{status:422}); }
}
