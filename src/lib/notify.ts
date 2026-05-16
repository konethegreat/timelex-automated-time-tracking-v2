import { toast } from "@/hooks/use-toast";

type NotifyOptions = {
  description?: string;
  duration?: number;
};

/** Radix/shadcn toast confirmations for API and workflow events. */
export const notify = {
  success(title: string, options?: NotifyOptions) {
    toast({
      title,
      description: options?.description,
      variant: "success",
      duration: options?.duration,
    });
  },

  error(title: string, options?: NotifyOptions) {
    toast({
      title,
      description: options?.description,
      variant: "destructive",
      duration: options?.duration,
    });
  },

  info(title: string, options?: NotifyOptions) {
    toast({
      title,
      description: options?.description,
      duration: options?.duration,
    });
  },
};
