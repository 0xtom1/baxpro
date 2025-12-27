import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

interface AlertCardProps {
  id: string;
  name: string;
  matchStrings: string[];
  matchAll?: boolean;
  maxPrice: number;
  bottledYearMin?: number | null;
  bottledYearMax?: number | null;
  ageMin?: number | null;
  ageMax?: number | null;
  createdAt: string;
  matchingAssetsString?: string | null;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function AlertCard({ 
  id, 
  name, 
  matchStrings, 
  matchAll = false,
  maxPrice, 
  bottledYearMin,
  bottledYearMax,
  ageMin,
  ageMax,
  createdAt,
  matchingAssetsString,
  onEdit,
  onDelete 
}: AlertCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete?.(id);
      console.log('Delete alert:', id);
    }, 300);
  };

  return (
    <Card 
      className={`p-6 hover-elevate transition-all ${isDeleting ? 'opacity-50 scale-95' : ''}`}
      data-testid={`card-alert-${id}`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2" data-testid={`text-alert-name-${id}`}>
            {name}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {matchStrings.map((str, idx) => (
              <Badge key={idx} variant="secondary" data-testid={`badge-match-${id}-${idx}`}>
                {str}
              </Badge>
            ))}
            {matchStrings.length > 1 && (
              <span className="text-xs text-muted-foreground ml-1" data-testid={`text-match-mode-${id}`}>
                ({matchAll ? "match all" : "match any"})
              </span>
            )}
          </div>
          
          {(bottledYearMin || bottledYearMax || ageMin || ageMax) && (
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {(bottledYearMin || bottledYearMax) && (
                <span data-testid={`text-bottled-year-${id}`}>
                  Bottled: {bottledYearMin && bottledYearMax ? `${bottledYearMin}-${bottledYearMax}` : bottledYearMin ? `${bottledYearMin}+` : `up to ${bottledYearMax}`}
                </span>
              )}
              {(ageMin || ageMax) && (
                <span data-testid={`text-age-${id}`}>
                  Age: {ageMin && ageMax ? `${ageMin}-${ageMax} years` : ageMin ? `${ageMin}+ years` : `up to ${ageMax} years`}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold text-primary" data-testid={`text-price-${id}`}>
            ≤ ${maxPrice.toLocaleString()}
          </span>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => {
              onEdit?.(id);
              console.log('Edit alert:', id);
            }}
            data-testid={`button-edit-${id}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={handleDelete}
            data-testid={`button-delete-${id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span data-testid={`text-created-${id}`}>Created {createdAt}</span>
        {matchingAssetsString && (
          <Badge variant="secondary" className="text-xs" data-testid={`badge-matches-${id}`}>
            {matchingAssetsString}
          </Badge>
        )}
      </div>
    </Card>
  );
}
