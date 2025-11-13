import * as React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface AutoFilledInputProps extends React.ComponentProps<typeof Input> {
  autoFilled?: boolean;
  isRequired?: boolean;
  label?: string;
}

const AutoFilledInput = React.forwardRef<HTMLInputElement, AutoFilledInputProps>(
  ({ className, autoFilled, isRequired, label, value, ...props }, ref) => {
    const isEmpty = !value || value === "";
    const showWarning = isRequired && isEmpty;

    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              {label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </label>
            {autoFilled && !isEmpty && (
              <Badge variant="secondary" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Auto-preenchido
              </Badge>
            )}
            {showWarning && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertCircle className="h-3 w-3" />
                Obrigatório
              </Badge>
            )}
          </div>
        )}
        <Input
          ref={ref}
          value={value}
          className={cn(
            autoFilled && !isEmpty && "border-primary bg-primary/5 ring-1 ring-primary/20",
            showWarning && "border-destructive bg-destructive/5",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

AutoFilledInput.displayName = "AutoFilledInput";

export { AutoFilledInput };
