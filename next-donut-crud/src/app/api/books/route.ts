import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveImageUpload, UploadValidationError } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET() {
  try {
    const books = await prisma.book.findMany({
      include: { reviews: { orderBy: { id: "desc" } } },
      orderBy: { id: "desc" },
    });

    return NextResponse.json(books);
  } catch (error) {
    console.error("Failed to list books:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดหนังสือได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
  const price = typeof priceValue === "string" && priceValue !== "" ? Number(priceValue) : 0;
  const stock = typeof stockValue === "string" && stockValue !== "" ? Number(stockValue) : 0;

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "กรุณาระบุชื่อหนังสือ" }, { status: 400 });
  }

  if (typeof author !== "string" || author.trim().length === 0) {
    return NextResponse.json({ error: "กรุณาระบุชื่อผู้แต่ง" }, { status: 400 });
  }

  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "ราคาต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป" }, { status: 400 });
  }

  if (!Number.isSafeInteger(stock) || stock < 0) {
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
    const coverUrl = cover && cover.size > 0 ? await saveImageUpload(cover) : null;
    const book = await prisma.book.create({
      data: {
        title: title.trim(),
        author: author.trim(),
        price,
        stock,
        ...(publishedAt ? { publishedAt } : {}),
        coverUrl,
      },
      include: { reviews: true },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Failed to create book:", error);
    return NextResponse.json({ error: "ไม่สามารถสร้างหนังสือได้" }, { status: 500 });
  }
}
