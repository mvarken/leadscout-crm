import { NextRequest, NextResponse } from "next/server";
import { formatLeadHistoryItem } from "@/lib/lead-activity-format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const PAGE_SIZE = 10;

export async function GET(
  request: NextRequest,
  {
    params
  }: {
    params: {
      id: string;
    };
  }
) {
  await requireUser();
  const skip = Math.max(
    0,
    Number.parseInt(request.nextUrl.searchParams.get("skip") ?? "0", 10) || 0
  );

  const rows = await prisma.leadActivity.findMany({
    where: { leadId: params.id },
    orderBy: { createdAt: "desc" },
    skip,
    take: PAGE_SIZE + 1,
    include: {
      user: {
        select: {
          name: true
        }
      }
    }
  });

  return NextResponse.json({
    items: rows.slice(0, PAGE_SIZE).map(formatLeadHistoryItem),
    hasMore: rows.length > PAGE_SIZE
  });
}
