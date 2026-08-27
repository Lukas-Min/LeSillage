import type { ProductType } from "@/db/schema";

export function labelForType(type: ProductType): string {
  switch (type) {
    case "DECANT":
      return "Decant";
    case "FULL_BOTTLE":
      return "Full bottle";
    case "PARTIAL":
      return "Partial";
    default: {
      const exhaustive: never = type;
      return String(exhaustive);
    }
  }
}
