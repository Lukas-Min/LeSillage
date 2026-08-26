import { Card, CardContent } from "@/components/ui/card";

export default function AdminProductCreatePage() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif-display text-2xl">New product</h1>
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Product creation is staged in the admin editor. Use this page as a hub for the
          catalog team, while the underlying editor lives behind the dropdown values on /admin/settings.
        </CardContent>
      </Card>
    </div>
  );
}
