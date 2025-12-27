import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X, Plus } from "lucide-react";
import { useState, useEffect } from "react";

const MAX_MATCH_STRINGS = 5;
const MAX_MATCH_STRING_LENGTH = 50;

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (alert: { 
    name: string; 
    matchStrings: string[]; 
    matchAll: boolean;
    maxPrice: number;
    bottledYearMin?: number | null;
    bottledYearMax?: number | null;
    ageMin?: number | null;
    ageMax?: number | null;
  }) => void;
  initialData?: {
    name: string;
    matchStrings: string[];
    matchAll?: boolean;
    maxPrice: number;
    bottledYearMin?: number | null;
    bottledYearMax?: number | null;
    ageMin?: number | null;
    ageMax?: number | null;
  };
}

export default function AlertModal({ open, onClose, onSave, initialData }: AlertModalProps) {
  const [name, setName] = useState("");
  const [matchStrings, setMatchStrings] = useState<string[]>([""]);
  const [matchAll, setMatchAll] = useState(false);
  const [maxPrice, setMaxPrice] = useState(0);
  const [bottledYearMin, setBottledYearMin] = useState<number | null>(null);
  const [bottledYearMax, setBottledYearMax] = useState<number | null>(null);
  const [ageMin, setAgeMin] = useState<number | null>(null);
  const [ageMax, setAgeMax] = useState<number | null>(null);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) {
      setName(initialData?.name || "");
      setMatchStrings(initialData?.matchStrings || [""]);
      setMatchAll(initialData?.matchAll ?? false);
      setMaxPrice(initialData?.maxPrice || 0);
      setBottledYearMin(initialData?.bottledYearMin ?? null);
      setBottledYearMax(initialData?.bottledYearMax ?? null);
      setAgeMin(initialData?.ageMin ?? null);
      setAgeMax(initialData?.ageMax ?? null);
      setAttemptedSave(false);
      setTouchedFields(new Set());
    }
  }, [open, initialData]);

  const handleFieldBlur = (index: number) => {
    setTouchedFields(prev => new Set(prev).add(index));
  };

  const addMatchString = () => {
    if (matchStrings.length < MAX_MATCH_STRINGS) {
      setMatchStrings([...matchStrings, ""]);
    }
  };

  const removeMatchString = (index: number) => {
    setMatchStrings(matchStrings.filter((_, i) => i !== index));
  };

  const updateMatchString = (index: number, value: string) => {
    const updated = [...matchStrings];
    updated[index] = value;
    setMatchStrings(updated);
  };

  const isValidMatchString = (str: string): boolean => {
    const trimmed = str.trim();
    if (trimmed.length === 0) return true;
    const hasNumber = /\d/.test(trimmed);
    const hasMinLength = trimmed.length >= 2;
    return hasNumber || hasMinLength;
  };

  const getMatchStringError = (str: string, showMinLengthError: boolean): string | null => {
    const trimmed = str.trim();
    if (trimmed.length === 0) return null;
    if (trimmed.length > MAX_MATCH_STRING_LENGTH) {
      return `Maximum ${MAX_MATCH_STRING_LENGTH} characters`;
    }
    if (showMinLengthError && !isValidMatchString(trimmed)) {
      return "Must be at least 2 characters or contain a number";
    }
    return null;
  };

  const hasValidationErrors = (): boolean => {
    const nonEmptyStrings = matchStrings.filter(s => s.trim() !== "");
    if (nonEmptyStrings.length === 0) return true;
    return nonEmptyStrings.some(s => 
      s.trim().length > MAX_MATCH_STRING_LENGTH || !isValidMatchString(s)
    );
  };

  const handleSave = () => {
    setAttemptedSave(true);
    if (hasValidationErrors()) return;
    
    const filteredStrings = matchStrings.filter(s => s.trim() !== "");
    onSave?.({ 
      name, 
      matchStrings: filteredStrings, 
      matchAll,
      maxPrice,
      bottledYearMin: bottledYearMin || null,
      bottledYearMax: bottledYearMax || null,
      ageMin: ageMin || null,
      ageMax: ageMax || null,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="dialog-alert-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {initialData ? 'Edit Alert' : 'Create New Alert'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="alert-name">Alert Name<span className="text-destructive ml-1">*</span></Label>
            <p className="text-xs text-muted-foreground">
              A friendly name to identify this alert - not used for matching
            </p>
            <Input
              id="alert-name"
              placeholder="e.g., Pappy Alert"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-alert-name"
            />
          </div>

          <div className="space-y-2">
            <Label>Search Terms<span className="text-destructive ml-1">*</span></Label>
            <p className="text-xs text-muted-foreground">
              Enter terms to match against bottle names on Baxus
            </p>
            <div className="space-y-3">
              {matchStrings.map((str, idx) => {
                const showError = attemptedSave || touchedFields.has(idx);
                const error = getMatchStringError(str, showError);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., Pappy Van Winkle"
                        value={str}
                        onChange={(e) => updateMatchString(idx, e.target.value)}
                        onBlur={() => handleFieldBlur(idx)}
                        className={error ? "border-destructive" : ""}
                        data-testid={`input-match-string-${idx}`}
                      />
                      {matchStrings.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeMatchString(idx)}
                          data-testid={`button-remove-match-${idx}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {error && (
                      <p className="text-sm text-destructive" data-testid={`error-match-string-${idx}`}>
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
              <Button
                variant="outline"
                onClick={addMatchString}
                disabled={matchStrings.length >= MAX_MATCH_STRINGS}
                className="w-full"
                data-testid="button-add-match-string"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Search Term ({matchStrings.length}/{MAX_MATCH_STRINGS})
              </Button>
            </div>

            <div className="pt-3 border-t">
              <Label className="text-sm font-medium">Match Logic</Label>
              <p className="text-xs text-muted-foreground mb-3">
                How should the search terms match the bottle name?
              </p>
              <RadioGroup
                value={matchAll ? "all" : "any"}
                onValueChange={(value) => setMatchAll(value === "all")}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="any" id="match-any" data-testid="radio-match-any" />
                  <Label htmlFor="match-any" className="font-normal cursor-pointer">
                    Match <span className="font-semibold">any</span> term — alert triggers if any one term matches
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="all" id="match-all" data-testid="radio-match-all" />
                  <Label htmlFor="match-all" className="font-normal cursor-pointer">
                    Match <span className="font-semibold">all</span> terms — alert triggers only if all terms match
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-price">Maximum Price ($)<span className="text-destructive ml-1">*</span></Label>
            <p className="text-xs text-muted-foreground">
              Alert triggers when a listing is at or below this price
            </p>
            <Input
              id="max-price"
              type="number"
              placeholder="500"
              value={maxPrice || ""}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              data-testid="input-max-price"
            />
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Metadata Filters (Optional)</Label>
              <p className="text-xs text-muted-foreground">
                These filters depend on bottle metadata - not all bottles have this info
              </p>
            </div>

            <div className="space-y-2">
              <Label>Bottled Year Range</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bottled-year-min" className="text-xs text-muted-foreground">
                    From Year
                  </Label>
                  <Input
                    id="bottled-year-min"
                    type="number"
                    placeholder="2015"
                    value={bottledYearMin ?? ""}
                    onChange={(e) => setBottledYearMin(e.target.value ? Number(e.target.value) : null)}
                    data-testid="input-bottled-year-min"
                  />
                </div>
                <div>
                  <Label htmlFor="bottled-year-max" className="text-xs text-muted-foreground">
                    To Year
                  </Label>
                  <Input
                    id="bottled-year-max"
                    type="number"
                    placeholder="2020"
                    value={bottledYearMax ?? ""}
                    onChange={(e) => setBottledYearMax(e.target.value ? Number(e.target.value) : null)}
                    data-testid="input-bottled-year-max"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Age Range</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age-min" className="text-xs text-muted-foreground">
                    Min Age
                  </Label>
                  <Input
                    id="age-min"
                    type="number"
                    placeholder="10"
                    value={ageMin ?? ""}
                    onChange={(e) => setAgeMin(e.target.value ? Number(e.target.value) : null)}
                    data-testid="input-age-min"
                  />
                </div>
                <div>
                  <Label htmlFor="age-max" className="text-xs text-muted-foreground">
                    Max Age
                  </Label>
                  <Input
                    id="age-max"
                    type="number"
                    placeholder="15"
                    value={ageMax ?? ""}
                    onChange={(e) => setAgeMax(e.target.value ? Number(e.target.value) : null)}
                    data-testid="input-age-max"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={hasValidationErrors() || !name.trim()}
            data-testid="button-save-alert"
          >
            {initialData ? 'Update Alert' : 'Create Alert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
