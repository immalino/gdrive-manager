import { redirect } from 'next/navigation';

interface FilesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FilesPage({ searchParams }: FilesPageProps) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  redirect(`/dashboard${qs ? `?${qs}` : ''}`);
}
