import fs from 'fs';
// app/api/route-patterns/route.ts
import { NextResponse } from 'next/server';
import path from 'path';

// Hàm getRoutePatterns (giữ nguyên từ code bạn cung cấp)
function getRoutePatterns(dir: string = 'app', basePath: string = '') {
  const patterns: string[] = [];
  const fullPath = path.join(process.cwd(), dir);

  if (!fs.existsSync(fullPath)) return patterns;

  const files = fs.readdirSync(fullPath);

  for (const file of files) {
    const filePath = path.join(fullPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      const isDynamic = file.match(/^\[.*\]$/);
      const segment = isDynamic ? `[${file.slice(1, -1)}]` : file;
      const newBasePath = `${basePath}/${segment}`;

      if (fs.existsSync(path.join(filePath, 'page.tsx'))) {
        patterns.push(newBasePath || '/');
      }

      patterns.push(...getRoutePatterns(path.join(dir, file), newBasePath));
    }
  }

  return patterns;
}

export async function GET() {
  const patterns = getRoutePatterns();
  return NextResponse.json(patterns);
}
