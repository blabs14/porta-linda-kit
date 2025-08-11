export type NotifyOptions = {
  title: string;
  description?: string;
};

// Importa o toast central da app (hook sem necessidade de provider aqui)
import { toast } from '../hooks/use-toast';

export function notifySuccess(opts: NotifyOptions) {
  toast({ title: opts.title, description: opts.description });
}

export function notifyError(opts: NotifyOptions) {
  toast({ title: opts.title, description: opts.description, variant: 'destructive' as any });
}

export function notifyInfo(opts: NotifyOptions) {
  toast({ title: opts.title, description: opts.description });
}

export function notifyWarn(opts: NotifyOptions) {
  toast({ title: opts.title, description: opts.description });
} 