import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  PieChart, 
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  color: string;
}

interface CategoryAnalysisProps {
  categories: CategoryData[];
  type: "income" | "expense";
}

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const trendColors = {
  up: "text-green-500",
  down: "text-red-500",
  stable: "text-muted-foreground",
};

export function CategoryAnalysis({ categories, type }: CategoryAnalysisProps) {
  const total = categories.reduce((acc, cat) => acc + cat.value, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            {type === "income" ? "Receitas por Categoria" : "Despesas por Categoria"}
          </div>
          <Badge variant="outline">
            R$ {total.toLocaleString("pt-BR")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map((category, index) => {
            const TrendIcon = trendIcons[category.trend];
            
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                    <TrendIcon className={`h-3 w-3 ${trendColors[category.trend]}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {category.percentage.toFixed(1)}%
                    </span>
                    <span className="font-semibold">
                      R$ {category.value.toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={category.percentage} 
                  className="h-2"
                  style={{ 
                    ["--progress-background" as any]: category.color 
                  }}
                />
              </motion.div>
            );
          })}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <PieChart className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma categoria encontrada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
