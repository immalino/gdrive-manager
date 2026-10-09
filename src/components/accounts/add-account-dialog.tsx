'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Laptop,
  Loader2,
  Plus,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api-client';

interface ConnectTokenResponse {
  id: string;
  token: string;
  url: string;
  expiresAt: string;
}

interface ConnectTokenStatusResponse {
  id: string;
  token: string;
  status: 'pending' | 'completed' | 'expired';
  connectedEmail: string | null;
  expiresAt: string;
}

interface AddAccountDialogProps {
  triggerText?: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
}

export function AddAccountDialog({
  triggerText = 'Add Account',
  variant = 'default',
  size = 'default',
}: AddAccountDialogProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'share'>('direct');
  const [connectTokenData, setConnectTokenData] = useState<ConnectTokenResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Mutasi untuk generate token baru
  const generateTokenMutation = useMutation({
    mutationFn: () => api.post<ConnectTokenResponse>('/api/accounts/connect-token'),
    onSuccess: (data) => {
      setConnectTokenData(data);
      setCopied(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal membuat share link.');
    },
  });

  // Polling status token saat dialog terbuka & ada token pending
  const { data: statusData } = useQuery({
    queryKey: ['connect-token-status', connectTokenData?.token],
    queryFn: () =>
      api.get<ConnectTokenStatusResponse>(
        `/api/accounts/connect-token/${connectTokenData!.token}/status`,
      ),
    enabled: isOpen && !!connectTokenData?.token && activeTab === 'share',
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.status;
      if (currentStatus === 'completed' || currentStatus === 'expired') {
        return false;
      }
      return 2500;
    },
  });

  // Invalidate storage & tampilkan toast saat status completed
  useEffect(() => {
    if (statusData?.status === 'completed') {
      queryClient.invalidateQueries({ queryKey: ['storage'] });
      toast.success(
        statusData.connectedEmail
          ? `Akun ${statusData.connectedEmail} berhasil ditambahkan ke pool!`
          : 'Akun Google berhasil ditambahkan ke pool!',
      );
    }
  }, [statusData?.status, statusData?.connectedEmail, queryClient]);

  // Handle pembuatan token otomatis saat tab share link dipilih jika belum ada
  const handleTabChange = (val: string | number | null) => {
    const tab = val === 'share' ? 'share' : 'direct';
    setActiveTab(tab);
    if (tab === 'share' && !connectTokenData && !generateTokenMutation.isPending) {
      generateTokenMutation.mutate();
    }
  };

  const handleCopy = async () => {
    if (!connectTokenData?.url) return;
    try {
      await navigator.clipboard.writeText(connectTokenData.url);
      setCopied(true);
      toast.success('Link berhasil disalin ke clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin link.');
    }
  };

  const isCompleted = statusData?.status === 'completed';
  const isExpired = statusData?.status === 'expired';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button variant={variant} size={size} className="gap-2">
            <Plus className="size-4" />
            {triggerText}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Akun Google</DialogTitle>
          <DialogDescription>
            Pilih cara menghubungkan akun Google Drive sebagai penyimpanan pool.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct" className="gap-1.5">
              <Laptop className="size-3.5" />
              Browser Ini
            </TabsTrigger>
            <TabsTrigger value="share" className="gap-1.5">
              <Share2 className="size-3.5" />
              Browser / Perangkat Lain
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Direct Connect */}
          <TabsContent value="direct" className="space-y-4 pt-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground">Hubungkan Langsung</p>
              <p>
                Gunakan opsi ini jika Anda sudah login ke akun Google tujuan di browser ini. Anda
                akan diarahkan ke halaman persetujuan Google.
              </p>
            </div>

            <Button
              render={<a href="/api/google/connect" />}
              className="w-full gap-2"
              onClick={() => setIsOpen(false)}
            >
              <Globe className="size-4" />
              Login dengan Google
              <ExternalLink className="size-3.5 opacity-70" />
            </Button>
          </TabsContent>

          {/* TAB 2: Share Link */}
          <TabsContent value="share" className="space-y-4 pt-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground">Share Link (Lintas Browser)</p>
              <p>
                Salin dan buka link ini di browser lain, mode incognito, atau perangkat lain (HP /
                laptop) tempat akun Google Anda aktif. Browser tujuan tidak perlu login ke aplikasi.
              </p>
            </div>

            {generateTokenMutation.isPending ? (
              <div className="flex h-24 items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                Membuat share link...
              </div>
            ) : connectTokenData ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={connectTokenData.url}
                    className="text-xs font-mono select-all"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="shrink-0 gap-1.5 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3.5 text-emerald-500" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        Salin
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
                  <span>Masa berlaku link: 15 menit</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    disabled={generateTokenMutation.isPending}
                    onClick={() => generateTokenMutation.mutate()}
                  >
                    <RefreshCw
                      className={`size-3 ${generateTokenMutation.isPending ? 'animate-spin' : ''}`}
                    />
                    Buat Link Baru
                  </Button>
                </div>

                {/* Status Box */}
                {isCompleted ? (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5">
                    <CheckCircle2 className="size-5 shrink-0" />
                    <div>
                      <p className="font-medium">Berhasil Terhubung!</p>
                      <p className="text-[11px] opacity-90">
                        {statusData?.connectedEmail
                          ? `Akun ${statusData.connectedEmail} telah ditambahkan.`
                          : 'Akun Google telah ditambahkan.'}
                      </p>
                    </div>
                  </div>
                ) : isExpired ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-between gap-2">
                    <span>Link ini telah kadaluarsa.</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => generateTokenMutation.mutate()}
                    >
                      Perbarui
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/80 bg-background/50 p-3 text-xs text-muted-foreground flex items-center gap-2.5">
                    <Loader2 className="size-4 animate-spin text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-xs">Menunggu otorisasi...</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Buka link di browser tujuan dan selesaikan login Google.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                type="button"
                className="w-full gap-2 text-xs"
                onClick={() => generateTokenMutation.mutate()}
              >
                <Share2 className="size-3.5" />
                Buat Share Link
              </Button>
            )}

            {isCompleted && (
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                onClick={() => setIsOpen(false)}
              >
                Selesai
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
