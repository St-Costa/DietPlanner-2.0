import matter from "gray-matter";

export interface ParsedFile<T = Record<string, unknown>> {
  data: T;
  content: string; // markdown body (without frontmatter)
}

export async function parseFile<T = Record<string, unknown>>(filePath: string): Promise<ParsedFile<T>> {
  const raw = await Bun.file(filePath).text();
  const { data, content } = matter(raw);
  return { data: data as T, content: content.trim() };
}

export async function writeFile(filePath: string, data: Record<string, unknown>, content: string): Promise<void> {
  const raw = matter.stringify(content, data);
  await Bun.write(filePath, raw);
}
