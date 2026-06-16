import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useLocation } from "react-router-dom";

export function Toaster() {
  const { toasts } = useToast();
  const location = useLocation();
  const isChecklistPage = location.pathname === "/service-checklist";

  return (
    <ToastProvider duration={2000}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} onClick={() => props.onOpenChange?.(false)} className="cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all">
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
