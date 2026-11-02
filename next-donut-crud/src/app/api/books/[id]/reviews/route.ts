import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function POST(request: Request, { params }: RouteContext) {
  const bookId = parseId((await params).id);
  if (bookId === null) {
    return NextResponse.json({ error: "รหัสหนังสือไม่ถูกต้อง" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("rating" in body) || !("content" in body)) {
    return NextResponse.json({ error: "กรุณาระบุคะแนนและเนื้อหารีวิว" }, { status: 400 });
  }

  if (typeof body.rating !== "number" || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "คะแนนรีวิวต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 5" }, { status: 400 });
  }

  if (typeof body.content !== "string" || body.content.trim().length === 0) {
    return NextResponse.json({ error: "กรุณาระบุเนื้อหารีวิว" }, { status: 400 });
  }

  try {
    const review = await prisma.review.create({
      data: {
        rating: body.rating,
        content: body.content.trim(),
        bookId,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "ไม่พบหนังสือที่ต้องการรีวิว" }, { status: 404 });
    }

    console.error("Failed to create review:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกรีวิวได้" }, { status: 500 });
  }
}
