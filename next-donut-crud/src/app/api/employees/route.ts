import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type EmployeeInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  position: string;
};

function parseEmployee(body: unknown): EmployeeInput | null {
  if (
    typeof body !== "object" ||
    body === null ||
    !("firstName" in body) ||
    typeof body.firstName !== "string" ||
    !("lastName" in body) ||
    typeof body.lastName !== "string" ||
    !("phone" in body) ||
    typeof body.phone !== "string" ||
    !("email" in body) ||
    typeof body.email !== "string" ||
    !("position" in body) ||
    typeof body.position !== "string"
  ) {
    return null;
  }

  const employee: EmployeeInput = {
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    phone: body.phone.trim(),
    email: body.email.trim(),
    position: body.position.trim(),
  };

  if (
    !employee.firstName ||
    !employee.lastName ||
    !employee.phone ||
    !employee.email ||
    !employee.position
  ) {
    return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) return null;

  return employee;
}

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({ orderBy: { id: "desc" } });
    return NextResponse.json(employees);
  } catch (error) {
    console.error("Failed to list employees:", error);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลพนักงานได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const employee = parseEmployee(body);
  if (!employee) {
    return NextResponse.json(
      { error: "กรุณากรอกชื่อ นามสกุล เบอร์โทร อีเมล และตำแหน่งให้ถูกต้อง" },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.employee.create({ data: employee });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "อีเมลนี้มีอยู่ในระบบแล้ว" }, { status: 409 });
    }

    console.error("Failed to create employee:", error);
    return NextResponse.json({ error: "ไม่สามารถเพิ่มพนักงานได้" }, { status: 500 });
  }
}
