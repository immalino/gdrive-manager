'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  FolderPlus,
  HardDrive,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  ArrowRight,
  FolderCheck,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

import { extractFolderId } from '@/lib/google-drive/extract-folder-id';

interface AccountItem {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  status: string;
  role: 'primary' | 'pool';
  createdAt: string;
}

interface SetupStatus {
  isSetupDone: boolean;
  sharedRoot?: {
    id: string;
    folderName: string;
    driveFolderId: string;
    primaryAccountId: string;
  } | null;
  primaryAccount?: AccountItem | null;
}

export function SetupWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string>('');
  const [rootMode, setRootMode] = useState<'new' | 'existing'>('new');
  const [folderName, setFolderName] = useState('GDrive Pool');
  const [existingFolderInput, setExistingFolderInput] = useState('');

  // Fetch setup status
  const { data: statusData, isLoading: isLoadingStatus } = useQuery<SetupStatus>({
    queryKey: ['setup-status'],
    queryFn: async () => {
      const res = await fetch('/api/setup/status');
      if (!res.ok) throw new Error('Gagal memuat status setup');
      return res.json();
    },
  });

  // Fetch accounts
  const { data: accountsData, isLoading: isLoadingAccounts } = useQuery<{
    accounts: AccountItem[];
  }>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      if (!res.ok) throw new Error('Gagal memuat daftar akun');
      return res.json();
    },
  });

  const accounts = accountsData?.accounts ?? [];
  const effectiveStep = statusData?.isSetupDone ? 4 : step;
  const effectivePrimaryId =
    selectedPrimaryId || accounts.find((a) => a.role === 'primary')?.id || accounts[0]?.id || '';

  // Mutation to initialize shared root
  const initMutation = useMutation({
    mutationFn: async (payload: {
      primaryAccountId: string;
      folderName?: string;
      existingFolderId?: string;
    }) => {
      const res = await fetch('/api/setup/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Gagal menginisialisasi Shared Root');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      if (variables.existingFolderId) {
        toast.success('Folder yang sudah ada berhasil dihubungkan sebagai root!');
      } else {
        toast.success('Folder root berhasil dibuat di Google Drive akun utama!');
      }
      queryClient.invalidateQueries({ queryKey: ['setup-status'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setStep(3);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Terjadi kesalahan saat mengatur folder root');
    },
  });

  if (isLoadingStatus || isLoadingAccounts) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Memeriksa status setup...</p>
      </div>
    );
  }

  const steps = [
    { num: 1, title: 'Akun Utama', desc: 'Pilih Akun' },
    { num: 2, title: 'Folder Root', desc: 'Buat Folder' },
    { num: 3, title: 'Pool Accounts', desc: 'Ekspansi Storage' },
    { num: 4, title: 'Selesai', desc: 'Siap Pakai' },
  ];

  return (
    <div className="max-w-2xl mx-auto w-full py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Sparkles className="size-3.5" />
          Setup Shared Virtual Drive
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Konfigurasi Shared Drive Pool</h1>
        <p className="text-sm text-muted-foreground">
          Satukan ruang penyimpanan dari berbagai akun Google Drive ke dalam satu root virtual
          folder.
        </p>
      </div>

      {/* Stepper Indicator */}
      <div className="grid grid-cols-4 gap-2">
        {steps.map((s) => {
          const isPassed = effectiveStep > s.num;
          const isCurrent = effectiveStep === s.num;
          return (
            <div
              key={s.num}
              className={`p-3 rounded-lg border text-center transition-all ${
                isCurrent
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : isPassed
                    ? 'border-border/60 bg-muted/30 text-muted-foreground'
                    : 'border-border/40 text-muted-foreground/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-xs">
                {isPassed ? (
                  <CheckCircle2 className="size-3.5 text-green-500" />
                ) : (
                  <span className="font-semibold">{s.num}.</span>
                )}
                <span>{s.title}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Connect Primary Account */}
      {effectiveStep === 1 && (
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <CardTitle>Hubungkan Akun Google Utama</CardTitle>
            </div>
            <CardDescription>
              Akun utama adalah pemilik (owner) dari folder root dan semua subfolder yang dibuat di
              dalam pool.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 p-8 text-center space-y-4">
                <HardDrive className="size-10 mx-auto text-muted-foreground/60" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Belum ada akun Google terhubung</p>
                  <p className="text-xs text-muted-foreground">
                    Hubungkan akun Google Drive pertama Anda sebagai akun utama.
                  </p>
                </div>
                <Button
                  render={<a href="/api/google/connect?redirect=/dashboard/setup" />}
                  className="gap-2"
                >
                  <Plus className="size-4" />
                  Hubungkan Akun Google
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pilih Akun yang Dijadikan Utama
                </Label>
                <div className="space-y-2">
                  {accounts.map((acc) => {
                    const isSelected = effectivePrimaryId === acc.id;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => setSelectedPrimaryId(acc.id)}
                        className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-border/80 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            {acc.picture && <AvatarImage src={acc.picture} alt={acc.email} />}
                            <AvatarFallback>{acc.email[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium leading-none">
                              {acc.name || acc.email}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{acc.email}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <Badge variant="default" className="text-xs">
                            Pilihan Utama
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            {accounts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                render={<a href="/api/google/connect?redirect=/dashboard/setup" />}
                className="gap-1.5 text-xs"
              >
                <Plus className="size-3.5" />
                Hubungkan Akun Lain
              </Button>
            )}
            <div className="ml-auto">
              <Button disabled={!effectivePrimaryId} onClick={() => setStep(2)} className="gap-2">
                Lanjut: Atur Folder Root
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Configure Root Folder */}
      {effectiveStep === 2 && (
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FolderPlus className="size-5 text-primary" />
              <CardTitle>Atur Folder Root di Akun Utama</CardTitle>
            </div>
            <CardDescription>
              Tentukan folder Google Drive di akun utama yang akan menjadi root virtual drive untuk
              menyimpan semua file pool.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="p-3 rounded-lg bg-muted/40 border text-xs space-y-1">
              <span className="text-muted-foreground font-medium">Akun Utama Terpilih:</span>
              <p className="font-semibold text-foreground">
                {accounts.find((a) => a.id === effectivePrimaryId)?.email}
              </p>
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-lg border">
              <button
                type="button"
                onClick={() => setRootMode('new')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                  rootMode === 'new'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FolderPlus className="size-4" />
                Buat Folder Baru
              </button>
              <button
                type="button"
                onClick={() => setRootMode('existing')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                  rootMode === 'existing'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FolderCheck className="size-4" />
                Gunakan Folder yang Ada
              </button>
            </div>

            {/* Mode 1: New Folder */}
            {rootMode === 'new' && (
              <div className="space-y-2">
                <Label htmlFor="folder-name">Nama Folder Root Baru</Label>
                <Input
                  id="folder-name"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="GDrive Pool"
                  disabled={initMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Aplikasi akan membuat folder baru di Google Drive akun utama dengan nama ini. Nama
                  default: <span className="font-medium text-foreground">GDrive Pool</span>.
                </p>
              </div>
            )}

            {/* Mode 2: Existing Folder */}
            {rootMode === 'existing' && (
              <div className="space-y-2">
                <Label htmlFor="existing-folder">Folder ID atau Link Google Drive</Label>
                <Input
                  id="existing-folder"
                  value={existingFolderInput}
                  onChange={(e) => setExistingFolderInput(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/... atau Folder ID"
                  disabled={initMutation.isPending}
                />
                <div className="rounded-lg bg-muted/30 border p-3 text-xs text-muted-foreground space-y-1.5">
                  <p className="font-medium text-foreground">Cara mendapatkan Folder ID:</p>
                  <ol className="list-decimal list-inside space-y-0.5 pl-1">
                    <li>Buka Google Drive di akun utama.</li>
                    <li>Buka folder yang ingin Anda gunakan sebagai root pool.</li>
                    <li>Salin link di URL bar browser Anda dan tempel di atas.</li>
                  </ol>
                  <p className="text-[11px] text-muted-foreground/80">
                    Sistem akan otomatis mengekstrak Folder ID dan memeriksa izin akses folder
                    tersebut.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <Button variant="outline" onClick={() => setStep(1)} disabled={initMutation.isPending}>
              Kembali
            </Button>
            <Button
              onClick={() => {
                if (rootMode === 'new') {
                  if (!folderName.trim()) {
                    toast.error('Nama folder tidak boleh kosong');
                    return;
                  }
                  initMutation.mutate({
                    primaryAccountId: effectivePrimaryId,
                    folderName: folderName.trim(),
                  });
                } else {
                  const extractedId = extractFolderId(existingFolderInput);
                  if (!extractedId) {
                    toast.error('Masukkan Folder ID atau URL Google Drive yang valid');
                    return;
                  }
                  initMutation.mutate({
                    primaryAccountId: effectivePrimaryId,
                    existingFolderId: extractedId,
                  });
                }
              }}
              disabled={
                initMutation.isPending ||
                (rootMode === 'new' && !folderName.trim()) ||
                (rootMode === 'existing' && !existingFolderInput.trim())
              }
              className="gap-2"
            >
              {initMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {rootMode === 'new'
                    ? 'Membuat Folder & Mengatur Sharing...'
                    : 'Memverifikasi Folder & Mengatur Sharing...'}
                </>
              ) : (
                <>
                  {rootMode === 'new' ? 'Buat Folder Root' : 'Gunakan Folder Ini'}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Add More Accounts */}
      {effectiveStep === 3 && (
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <CardTitle>Perluas Storage dengan Akun Lain</CardTitle>
            </div>
            <CardDescription>
              Folder root telah dibuat. Tambahkan akun Google lain untuk memperluas total kapasitas
              storage. Setiap akun yang terhubung akan otomatis diberi izin Editor ke folder root.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Akun Terhubung ({accounts.length})
              </div>
              <div className="space-y-2">
                {accounts.map((acc) => {
                  const isPrimary = acc.role === 'primary' || acc.id === effectivePrimaryId;
                  return (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          {acc.picture && <AvatarImage src={acc.picture} alt={acc.email} />}
                          <AvatarFallback>{acc.email[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-none">
                            {acc.name || acc.email}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{acc.email}</p>
                        </div>
                      </div>
                      <Badge variant={isPrimary ? 'default' : 'secondary'} className="text-xs">
                        {isPrimary ? 'Akun Utama (Owner)' : 'Pool Account (Editor)'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                render={<a href="/api/google/connect?redirect=/dashboard/setup" />}
                className="w-full gap-2 border-dashed"
              >
                <Plus className="size-4" />
                Hubungkan Akun Google Baru
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <span className="text-xs text-muted-foreground self-center">
              Anda selalu dapat menambah akun nanti lewat menu Accounts.
            </span>
            <Button onClick={() => setStep(4)} className="gap-2">
              Lanjut ke Selesai
              <ArrowRight className="size-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Done! */}
      {effectiveStep === 4 && (
        <Card className="border-border">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto size-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-2">
              <FolderCheck className="size-6" />
            </div>
            <CardTitle className="text-xl">Shared Virtual Drive Siap!</CardTitle>
            <CardDescription>
              Setup awal telah selesai. Semua akun terhubung dapat menyimpan file ke dalam folder
              root bersama.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border text-sm">
              <div className="flex justify-between p-3">
                <span className="text-muted-foreground">Folder Root</span>
                <span className="font-medium text-foreground">
                  {statusData?.sharedRoot?.folderName || folderName}
                </span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-muted-foreground">Akun Utama</span>
                <span className="font-medium text-foreground">
                  {statusData?.primaryAccount?.email ||
                    accounts.find((a) => a.id === effectivePrimaryId)?.email ||
                    'Terhubung'}
                </span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-muted-foreground">Total Akun Terhubung</span>
                <span className="font-medium text-foreground">{accounts.length} Akun</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-4">
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => {
                router.push('/dashboard');
                router.refresh();
              }}
            >
              Masuk ke My Drive
              <ArrowRight className="size-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
