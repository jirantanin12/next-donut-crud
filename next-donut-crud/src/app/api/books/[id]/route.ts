import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveImageUpload, UploadValidationError } from "@/lib/uploads";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "รหัสหนังสือไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const book = await prisma.book.findUnique({
      where: { id },
      include: { reviews: { orderBy: { id: "desc" } } },
    });

    if (!book) {
      return NextResponse.json({ error: "ไม่พบหนังสือ" }, { status: 404 });
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error("Failed to get book:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดหนังสือได้" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "รหัสหนังสือไม่ถูกต้อง" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "กรุณาส่งข้อมูลแบบ multipart/form-data" }, { status: 400 });
  }

  const title = formData.get("title");
  const author = formData.get("author");
  const priceValue = formData.get("price");
  const stockValue = formData.get("stock");
  const publishedAtValue = formData.get("publishedAt");
  const cover = formData.get("cover");
  const price = typeof priceValue === "string" && priceValue !== "" ? Number(priceValue) : undefined;
  const stock = typeof stockValue === "string" && stockValue !== "" ? Number(stockValue) : undefined;

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "กรุณาระบุชื่อหนังสือ" }, { status: 400 });
  }

  if (typeof author !== "string" || author.trim().length === 0) {
    return NextResponse.json({ error: "กรุณาระบุชื่อผู้แต่ง" }, { status: 400 });
  }

  if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
    return NextResponse.json({ error: "ราคาต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป" }, { status: 400 });
  }

  if (stock !== undefined && (!Number.isSafeInteger(stock) || stock < 0)) {
    return NextResponse.json({ error: "สต๊อคต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป" }, { status: 400 });
  }

  if (cover !== null && typeof cover === "string") {
    return NextResponse.json({ error: "ข้อมูลรูปปกไม่ถูกต้อง" }, { status: 400 });
  }

  const publishedAt =
    typeof publishedAtValue === "string" && publishedAtValue.length > 0
      ? new Date(publishedAtValue)
      : undefined;

  if (publishedAt && Number.isNaN(publishedAt.getTime())) {
    return NextResponse.json({ error: "วันที่ตีพิมพ์ไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const coverUrl = cover && cover.size > 0 ? await saveImageUpload(cover) : undefined;
    const book = await prisma.book.update({
      where: { id },
      data: {
        title: title.trim(),
        author: author.trim(),
        ...(price !== undefined ? { price } : {}),
        ...(stock !== undefined ? { stock } : {}),
        ...(publishedAt ? { publishedAt } : {}),
        ...(coverUrl ? { coverUrl } : {}),
      },
      include: { reviews: true },
    });

    return NextResponse.json(book);
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "ไม่พบหนังสือ" }, { status: 404 });
      }
    }

    console.error("Failed to update book:", error);
    return NextResponse.json({ error: "ไม่สามารถแก้ไขหนังสือได้" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "รหัสหนังสือไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    await prisma.book.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบหนังสือ" }, { status: 404 });
    }

    console.error("Failed to delete book:", error);
    return NextResponse.json({ error: "ไม่สามารถลบหนังสือได้" }, { status: 500 });
  }
}
