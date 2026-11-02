# Next.js CRUD Boilerplate

Starter project for a full-stack CRUD exercise using Next.js 16 App Router,
React 19, Prisma 6.19, SQLite, and Tailwind CSS 4.

## Getting started

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

The SQLite database is `prisma/dev.db`. The schema contains `Book` and `Review`
models with a one-to-many relationship, plus an `Employee` model. Books include
price and stock fields. After changing a model, run
`npx prisma db push` again.

## API routes

- `GET /api/books` lists books with their nested reviews.
- `POST /api/books` creates a book using `multipart/form-data` fields `title`,
  `author`, `price`, `stock`, optional `publishedAt`, and optional image field
  `cover`.
- `GET`, `PUT`, and `DELETE /api/books/:id` manage one book. Book `PUT` accepts
  the same multipart form fields; omit `cover` to keep the current image.
- `POST /api/books/:id/reviews` creates a review using JSON fields `rating`
  (integer from 1 to 5) and `content`.
- `GET` and `POST /api/employees` list and create employees.
- `PUT` and `DELETE /api/employees/:id` update and delete employees.
  Employee JSON fields are `firstName`, `lastName`, `phone`, `email`, and
  `position`; email addresses must be unique.

Deleting a book also deletes its reviews.

Uploaded images are stored in `public/uploads/` and served from `/uploads/`.
Only JPEG, PNG, WebP, and GIF files up to 5 MB are accepted.

อ่านคู่มือภาษาไทยเรื่องการแก้ schema เพิ่มข้อมูล เขียน API และแก้หน้าเว็บได้ที่
[docs/คู่มือเริ่มต้น.md](./docs/คู่มือเริ่มต้น.md)

ดูคำสั่งติดตั้ง รันเว็บ จัดการฐานข้อมูล และตรวจโค้ดได้ที่
[docs/คำสั่งที่ใช้ในโปรเจกต์.md](./docs/คำสั่งที่ใช้ในโปรเจกต์.md)
