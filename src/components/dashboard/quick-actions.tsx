'use client';

import Link from 'next/link';
import { FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadButton } from '@/components/upload/upload-dialog';

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        <CardDescription>Aksi cepat untuk kelola file dan akun.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <UploadButton />
        <Button variant="outline" render={<a href="/api/google/connect" />}>
          <Plus />
          Add Account
        </Button>
        <Button variant="outline" render={<Link href="/dashboard/files" />}>
          <FolderOpen />
          File Manager
        </Button>
      </CardContent>
    </Card>
  );
}
