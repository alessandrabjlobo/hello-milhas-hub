import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricsCardProps {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  trend: "up" | "down";
}

export const MetricsCard = ({ title, value, change, icon: Icon, trend }: MetricsCardProps) => {
  return (
    <Card className="shadow-card hover:shadow-glow transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-bold">{value}</p>
          <p className={`text-sm font-medium ${trend === "up" ? "text-primary" : "text-destructive"}`}>
            {change} do mês anterior
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
