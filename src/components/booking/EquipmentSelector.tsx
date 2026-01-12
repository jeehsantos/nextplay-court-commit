import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Minus, Image as ImageIcon } from "lucide-react";
import type { Equipment } from "@/hooks/useVenueEquipment";

export interface SelectedEquipment {
  equipmentId: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  photoUrl?: string | null;
}

interface EquipmentSelectorProps {
  equipment: Equipment[];
  selectedEquipment: SelectedEquipment[];
  onSelectionChange: (selection: SelectedEquipment[]) => void;
  disabled?: boolean;
}

export function EquipmentSelector({
  equipment,
  selectedEquipment,
  onSelectionChange,
  disabled = false,
}: EquipmentSelectorProps) {
  const activeEquipment = equipment.filter(e => e.is_active);

  const getSelectedQuantity = (equipmentId: string): number => {
    const selected = selectedEquipment.find(e => e.equipmentId === equipmentId);
    return selected?.quantity || 0;
  };

  const handleQuantityChange = (item: Equipment, delta: number) => {
    const currentQty = getSelectedQuantity(item.id);
    const newQty = Math.max(0, Math.min(item.quantity_available, currentQty + delta));

    if (newQty === 0) {
      onSelectionChange(selectedEquipment.filter(e => e.equipmentId !== item.id));
    } else {
      const existing = selectedEquipment.find(e => e.equipmentId === item.id);
      if (existing) {
        onSelectionChange(
          selectedEquipment.map(e =>
            e.equipmentId === item.id ? { ...e, quantity: newQty } : e
          )
        );
      } else {
        onSelectionChange([
          ...selectedEquipment,
          {
            equipmentId: item.id,
            name: item.name,
            quantity: newQty,
            pricePerUnit: item.price_per_unit,
            photoUrl: (item as any).photo_url,
          },
        ]);
      }
    }
  };

  const totalEquipmentCost = selectedEquipment.reduce(
    (sum, item) => sum + item.quantity * item.pricePerUnit,
    0
  );

  if (activeEquipment.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Equipment Rental
          <Badge variant="secondary" className="ml-auto">Optional</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add equipment to your booking. Prices are per unit for the duration of your session.
        </p>

        <div className="divide-y divide-border">
          {activeEquipment.map((item) => {
            const selectedQty = getSelectedQuantity(item.id);
            const itemPhoto = (item as any).photo_url;

            return (
              <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex gap-3">
                  {/* Photo */}
                  <div className="w-16 h-16 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    {itemPhoto ? (
                      <img
                        src={itemPhoto}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-semibold text-primary">
                            ${item.price_per_unit.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {item.quantity_available} available
                          </span>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        {selectedQty > 0 ? (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleQuantityChange(item, -1)}
                              disabled={disabled}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-medium">
                              {selectedQty}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleQuantityChange(item, 1)}
                              disabled={disabled || selectedQty >= item.quantity_available}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item, 1)}
                            disabled={disabled || item.quantity_available === 0}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Equipment Total */}
        {selectedEquipment.length > 0 && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Equipment Subtotal</span>
              <span className="font-semibold text-primary">
                ${totalEquipmentCost.toFixed(2)}
              </span>
            </div>
            <div className="mt-1 space-y-1">
              {selectedEquipment.map((item) => (
                <div key={item.equipmentId} className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.name} × {item.quantity}</span>
                  <span>${(item.quantity * item.pricePerUnit).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
