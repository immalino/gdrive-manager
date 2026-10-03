import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AddAccountButton() {
  return (
    <Button render={<a href="/api/google/connect" />}>
      <Plus />
      Add Account
    </Button>
  );
}
