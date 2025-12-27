import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

interface PhoneDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function PhoneDialog({ open, onClose }: PhoneDialogProps) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPhoneNumber("");
      setSmsConsent(user?.smsConsent || false);
    }
  }, [open, user]);

  const handleSave = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number with at least 10 digits",
        variant: "destructive",
      });
      return;
    }

    if (!smsConsent) {
      toast({
        title: "Consent required",
        description: "You must agree to receive text messages",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/user/phone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, smsConsent }),
      });

      if (!response.ok) {
        throw new Error("Failed to update phone number");
      }

      await refreshUser();

      toast({
        title: "Phone number updated",
        description: "You'll receive text alerts at this number",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Failed to save",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="dialog-phone">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Phone Number
          </DialogTitle>
          <DialogDescription>
            Add your phone number to receive text alerts when matching bourbons are found
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone-number">Phone Number</Label>
            <Input
              id="phone-number"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              data-testid="input-phone-dialog"
            />
            <p className="text-xs text-muted-foreground">
              Enter your phone number including country code
            </p>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="sms-consent"
              checked={smsConsent}
              onCheckedChange={(checked) => setSmsConsent(checked === true)}
              data-testid="checkbox-sms-consent"
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="sms-consent"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                I agree to receive text message alerts
              </Label>
              <p className="text-xs text-muted-foreground">
                Message and data rates may apply. You can opt out at any time.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-phone">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !smsConsent} 
            data-testid="button-save-phone-dialog"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
