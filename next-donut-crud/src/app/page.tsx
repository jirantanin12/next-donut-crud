"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Review = {
  id: number;
  rating: number;
  content: string;
  bookId: number;
};

type Book = {
  id: number;
  title: string;
  author: string;
  price: number;
  stock: number;
  publishedAt: string;
  coverUrl: string | null;
  reviews: Review[];
};

type Employee = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  position: string;
};

type BookForm = {
  title: string;
  author: string;
  price: string;
  stock: string;
  publishedAt: string;
  cover: File | null;
};

type EmployeeForm = Omit<Employee, "id">;

type ReviewForm = {
  rating: string;
  content: string;
};

const emptyBookForm: BookForm = {
  title: "",
  author: "",
  price: "0",
  stock: "0",
  publishedAt: new Date().toISOString().slice(0, 10),
  cover: null,
};

const emptyEmployeeForm: EmployeeForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  position: "",
};

async function readResponse<T>(response: Response): Promise<T> {
  const body: unknown = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
    throw new Error(message);
  }

  return body as T;
}

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bookForm, setBookForm] = useState<BookForm>(emptyBookForm);
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>(emptyEmployeeForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [reviewForms, setReviewForms] = useState<Record<number, ReviewForm>>({});
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/books");
      setBooks(await readResponse<Book[]>(response));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ไม่สามารถโหลดรายการหนังสือได้");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await fetch("/api/employees");
      setEmployees(await readResponse<Employee[]>(response));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลพนักงานได้");
    }
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/books")
      .then((response) => readResponse<Book[]>(response))
      .then((loadedBooks) => {
        if (active) setBooks(loadedBooks);
      })
      .catch((error: unknown) => {
        if (active) {
          setNotice(error instanceof Error ? error.message : "ไม่สามารถโหลดรายการหนังสือได้");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/employees")
      .then((response) => readResponse<Employee[]>(response))
      .then((loadedEmployees) => {
        if (active) setEmployees(loadedEmployees);
      })
      .catch((error: unknown) => {
        if (active) {
          setNotice(error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลพนักงานได้");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function resetBookForm() {
    setBookForm({ ...emptyBookForm, publishedAt: new Date().toISOString().slice(0, 10) });
    setEditingId(null);
    setFileInputKey((key) => key + 1);
  }

  async function handleBookSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");

    const formData = new FormData();
    formData.set("title", bookForm.title);
    formData.set("author", bookForm.author);
    formData.set("price", bookForm.price);
    formData.set("stock", bookForm.stock);
    formData.set("publishedAt", bookForm.publishedAt);
    if (bookForm.cover) formData.set("cover", bookForm.cover);

    try {
      const response = await fetch(
        editingId === null ? "/api/books" : `/api/books/${editingId}`,
        { method: editingId === null ? "POST" : "PUT", body: formData },
      );
      await readResponse<Book>(response);
      resetBookForm();
      setNotice(editingId === null ? "เพิ่มหนังสือเรียบร้อยแล้ว" : "บันทึกการแก้ไขเรียบร้อยแล้ว");
      await loadBooks();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ไม่สามารถบันทึกหนังสือได้");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(book: Book) {
    setEditingId(book.id);
    setBookForm({
      title: book.title,
      author: book.author,
      price: String(book.price),
      stock: String(book.stock),
      publishedAt: new Date(book.publishedAt).toISOString().slice(0, 10),
      cover: null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteBook(book: Book) {
    if (!window.confirm(`ต้องการลบ “${book.title}” และรีวิวทั้งหมดใช่หรือไม่?`)) return;

    setNotice("");
    try {
      const response = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
      await readResponse<null>(response);
      setNotice("ลบหนังสือและรีวิวเรียบร้อยแล้ว");
      await loadBooks();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ไม่สามารถลบหนังสือได้");
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>, bookId: number) {
    event.preventDefault();
    const reviewForm = reviewForms[bookId] ?? { rating: "5", content: "" };
    setNotice("");

    try {
      const response = await fetch(`/api/books/${bookId}/reviews`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rating: Number(reviewForm.rating),
          content: reviewForm.content,
        }),
      });
      await readResponse<Review>(response);
      setReviewForms((current) => ({
        ...current,
        [bookId]: { rating: "5", content: "" },
      }));
      setNotice("เพิ่มรีวิวเรียบร้อยแล้ว");
      await loadBooks();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ไม่สามารถบันทึกรีวิวได้");
    }
  }

  function resetEmployeeForm() {
    setEmployeeForm(emptyEmployeeForm);
    setEditingEmployeeId(null);
  }

  async function handleEmployeeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    try {
      const response = await fetch(
        editingEmployeeId === null
          ? "/api/employees"
          : `/api/employees/${editingEmployeeId}`,
        {
          method: editingEmployeeId === null ? "POST" : "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(employeeForm),
        },
      );
      await readResponse<Employee>(response);
      resetEmployeeForm();
      setNotice(editingEmployeeId === null ? "เพิ่มพนักงานเรียบร้อยแล้ว" : "แก้ไขข้อมูลพนักงานแล้ว");
      await loadEmployees();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลพนักงานได้");
    }
  }

  function startEditingEmployee(employee: Employee) {
    setEditingEmployeeId(employee.id);
    setEmployeeForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone,
      email: employee.email,
      position: employee.position,
    });
  }

  async function deleteEmployee(employee: Employee) {
    if (!window.confirm(`ต้องการลบข้อมูล ${employee.firstName} ${employee.lastName} ใช่หรือไม่?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${employee.id}`, { method: "DELETE" });
      await readResponse<null>(response);
      setNotice("ลบข้อมูลพนักงานเรียบร้อยแล้ว");
      await loadEmployees();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ไม่สามารถลบข้อมูลพนักงานได้");
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold">หนังสือและรีวิว</h1>
      </header>

      {notice && (
        <p aria-live="polite" className="border border-slate-300 bg-white p-3" role="status">
          {notice}
        </p>
      )}

      <section className="space-y-4 border border-slate-300 bg-white p-4">
        <h2 className="text-xl font-semibold">
          {editingId === null ? "เพิ่มหนังสือ" : "แก้ไขหนังสือ"}
        </h2>
        <form className="flex max-w-xl flex-col gap-4" onSubmit={handleBookSubmit}>
          <label className="flex flex-col gap-1">
            ชื่อหนังสือ
            <input
              className="border border-slate-400 px-3 py-2"
              name="title"
              onChange={(event) =>
                setBookForm((current) => ({ ...current, title: event.target.value }))
              }
              required
              value={bookForm.title}
            />
          </label>

          <label className="flex flex-col gap-1">
            ผู้แต่ง
            <input
              className="border border-slate-400 px-3 py-2"
              name="author"
              onChange={(event) =>
                setBookForm((current) => ({ ...current, author: event.target.value }))
              }
              required
              value={bookForm.author}
            />
          </label>

          <label className="flex flex-col gap-1">
            ราคา
            <input
              className="border border-slate-400 px-3 py-2"
              min="0"
              name="price"
              onChange={(event) =>
                setBookForm((current) => ({ ...current, price: event.target.value }))
              }
              required
              step="0.01"
              type="number"
              value={bookForm.price}
            />
          </label>

          <label className="flex flex-col gap-1">
            สต๊อค
            <input
              className="border border-slate-400 px-3 py-2"
              min="0"
              name="stock"
              onChange={(event) =>
                setBookForm((current) => ({ ...current, stock: event.target.value }))
              }
              required
              step="1"
              type="number"
              value={bookForm.stock}
            />
          </label>

          <label className="flex flex-col gap-1">
            วันที่ตีพิมพ์
            <input
              className="border border-slate-400 px-3 py-2"
              name="publishedAt"
              onChange={(event) =>
                setBookForm((current) => ({ ...current, publishedAt: event.target.value }))
              }
              type="date"
              value={bookForm.publishedAt}
            />
          </label>

          <label className="flex flex-col gap-1">
            รูปปก {editingId !== null && "(ไม่เลือกเพื่อใช้รูปเดิม)"}
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              key={fileInputKey}
              name="cover"
              onChange={(event) =>
                setBookForm((current) => ({
                  ...current,
                  cover: event.target.files?.[0] ?? null,
                }))
              }
              type="file"
            />
            <span className="text-sm text-slate-600">
              JPEG, PNG, WebP หรือ GIF ขนาดไม่เกิน 5 MB
            </span>
          </label>

          <div className="flex gap-2">
            <button
              className="border border-slate-500 px-4 py-2 hover:bg-slate-100 disabled:opacity-50"
              disabled={saving}
              type="submit"
            >
              {saving ? "กำลังบันทึก..." : editingId === null ? "เพิ่มหนังสือ" : "บันทึก"}
            </button>
            {editingId !== null && (
              <button
                className="border border-slate-500 px-4 py-2 hover:bg-slate-100"
                onClick={resetBookForm}
                type="button"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-4" id="books">
        <h2 className="text-xl font-semibold">รายการหนังสือ ({books.length})</h2>

        {loading ? (
          <p>กำลังโหลดข้อมูล...</p>
        ) : books.length === 0 ? (
          <p>ยังไม่มีหนังสือในระบบ</p>
        ) : (
          <ul className="space-y-4">
            {books.map((book) => {
              const reviewForm = reviewForms[book.id] ?? { rating: "5", content: "" };

              return (
                <li className="space-y-4 border border-slate-300 bg-white p-4" key={book.id}>
                  <div className="flex gap-4">
                    {book.coverUrl && (
                      <div className="relative h-28 w-20 shrink-0">
                        <Image
                          alt={`ปกหนังสือ ${book.title}`}
                          className="object-cover"
                          fill
                          sizes="80px"
                          src={book.coverUrl}
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">{book.title}</h3>
                      <p>ผู้แต่ง: {book.author}</p>
                      <p>ราคา: {book.price.toLocaleString("th-TH")} บาท</p>
                      <p>สต๊อค: {book.stock} เล่ม</p>
                      <p>วันที่ตีพิมพ์: {new Date(book.publishedAt).toLocaleDateString("th-TH")}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="border border-slate-500 px-3 py-1 hover:bg-slate-100"
                      onClick={() => startEditing(book)}
                      type="button"
                    >
                      แก้ไข
                    </button>
                    <button
                      className="border border-slate-500 px-3 py-1 hover:bg-slate-100"
                      onClick={() => void deleteBook(book)}
                      type="button"
                    >
                      ลบ
                    </button>
                  </div>

                  <div className="space-y-2 border-t border-slate-300 pt-3">
                    <h4 className="font-semibold">รีวิว</h4>
                    {book.reviews.length === 0 ? (
                      <p>ยังไม่มีรีวิว</p>
                    ) : (
                      <ul className="list-inside list-disc space-y-1">
                        {book.reviews.map((review) => (
                          <li key={review.id}>
                            {review.rating}/5 — {review.content}
                          </li>
                        ))}
                      </ul>
                    )}

                    <form
                      className="flex max-w-xl flex-col gap-3 pt-2"
                      onSubmit={(event) => void submitReview(event, book.id)}
                    >
                      <label className="flex flex-col gap-1">
                        คะแนน
                        <select
                          className="border border-slate-400 px-3 py-2"
                          onChange={(event) =>
                            setReviewForms((current) => ({
                              ...current,
                              [book.id]: { ...reviewForm, rating: event.target.value },
                            }))
                          }
                          value={reviewForm.rating}
                        >
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <option key={rating} value={rating}>
                              {rating}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        เนื้อหารีวิว
                        <textarea
                          className="border border-slate-400 px-3 py-2"
                          onChange={(event) =>
                            setReviewForms((current) => ({
                              ...current,
                              [book.id]: { ...reviewForm, content: event.target.value },
                            }))
                          }
                          required
                          rows={3}
                          value={reviewForm.content}
                        />
                      </label>
                      <button
                        className="w-fit border border-slate-500 px-4 py-2 hover:bg-slate-100"
                        type="submit"
                      >
                        เพิ่มรีวิว
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4 border border-slate-300 bg-white p-4" id="employees">
        <h2 className="text-xl font-semibold">
          {editingEmployeeId === null ? "เพิ่มพนักงาน" : "แก้ไขข้อมูลพนักงาน"}
        </h2>
        <form className="flex max-w-xl flex-col gap-4" onSubmit={handleEmployeeSubmit}>
          <label className="flex flex-col gap-1">
            ชื่อ
            <input
              className="border border-slate-400 px-3 py-2"
              onChange={(event) =>
                setEmployeeForm((current) => ({ ...current, firstName: event.target.value }))
              }
              required
              value={employeeForm.firstName}
            />
          </label>

          <label className="flex flex-col gap-1">
            นามสกุล
            <input
              className="border border-slate-400 px-3 py-2"
              onChange={(event) =>
                setEmployeeForm((current) => ({ ...current, lastName: event.target.value }))
              }
              required
              value={employeeForm.lastName}
            />
          </label>

          <label className="flex flex-col gap-1">
            เบอร์โทร
            <input
              className="border border-slate-400 px-3 py-2"
              onChange={(event) =>
                setEmployeeForm((current) => ({ ...current, phone: event.target.value }))
              }
              required
              type="tel"
              value={employeeForm.phone}
            />
          </label>

          <label className="flex flex-col gap-1">
            อีเมล
            <input
              className="border border-slate-400 px-3 py-2"
              onChange={(event) =>
                setEmployeeForm((current) => ({ ...current, email: event.target.value }))
              }
              required
              type="email"
              value={employeeForm.email}
            />
          </label>

          <label className="flex flex-col gap-1">
            ตำแหน่ง
            <input
              className="border border-slate-400 px-3 py-2"
              onChange={(event) =>
                setEmployeeForm((current) => ({ ...current, position: event.target.value }))
              }
              required
              value={employeeForm.position}
            />
          </label>

          <div className="flex gap-2">
            <button className="border border-slate-500 px-4 py-2 hover:bg-slate-100" type="submit">
              {editingEmployeeId === null ? "เพิ่มพนักงาน" : "บันทึก"}
            </button>
            {editingEmployeeId !== null && (
              <button
                className="border border-slate-500 px-4 py-2 hover:bg-slate-100"
                onClick={resetEmployeeForm}
                type="button"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>

        <h3 className="pt-4 text-lg font-semibold">รายชื่อพนักงาน ({employees.length})</h3>
        {employees.length === 0 ? (
          <p>ยังไม่มีข้อมูลพนักงาน</p>
        ) : (
          <ul className="space-y-3">
            {employees.map((employee) => (
              <li className="space-y-2 border border-slate-300 p-3" key={employee.id}>
                <p>
                  {employee.firstName} {employee.lastName}
                </p>
                <p>เบอร์โทร: {employee.phone}</p>
                <p>อีเมล: {employee.email}</p>
                <p>ตำแหน่ง: {employee.position}</p>
                <div className="flex gap-2">
                  <button
                    className="border border-slate-500 px-3 py-1 hover:bg-slate-100"
                    onClick={() => startEditingEmployee(employee)}
                    type="button"
                  >
                    แก้ไข
                  </button>
                  <button
                    className="border border-slate-500 px-3 py-1 hover:bg-slate-100"
                    onClick={() => void deleteEmployee(employee)}
                    type="button"
                  >
                    ลบ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
