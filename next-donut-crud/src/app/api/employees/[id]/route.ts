import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type EmployeeInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  position: string;
};

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

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

export async function PUT(request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "รหัสพนักงานไม่ถูกต้อง" }, { status: 400 });
  }

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
    const updated = await prisma.employee.update({ where: { id }, data: employee });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json({ error: "อีเมลนี้มีอยู่ในระบบแล้ว" }, { status: 409 });
      }
    }

    console.error("Failed to update employee:", error);
    return NextResponse.json({ error: "ไม่สามารถแก้ไขข้อมูลพนักงานได้" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "รหัสพนักงานไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    await prisma.employee.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });
    }

    console.error("Failed to delete employee:", error);
    return NextResponse.json({ error: "ไม่สามารถลบพนักงานได้" }, { status: 500 });
  }
}
