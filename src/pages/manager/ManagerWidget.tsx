import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useManagerVenues } from "@/hooks/useManagerVenues";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Code2, Copy, Key, Loader2, Plus, Trash2, Eye, EyeOff } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  allowed_origins: string[];
  theme: Record<string, string>;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

const DEFAULT_THEME = {
  primaryColor: "#0ea5e9",
  backgroundColor: "#ffffff",
  textColor: "#0f172a",
  borderRadius: "8",
  fontFamily: "system-ui, sans-serif",
};

export default function ManagerWidget() {
  const { data: venues, isLoading: venuesLoading } = useManagerVenues();
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyOrigins, setNewKeyOrigins] = useState("");
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [revealedKey, setRevealedKey] = useState<{ id: string; key: string } | null>(null);
  const [previewKeyId, setPreviewKeyId] = useState<string>("");

  useEffect(() => {
    if (venues && venues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(venues[0].id);
    }
  }, [venues, selectedVenueId]);

  useEffect(() => {
    if (selectedVenueId) loadKeys();
  }, [selectedVenueId]);

  async function loadKeys() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-venue-api-keys", {
        body: { action: "list", venue_id: selectedVenueId },
      });
      if (error) throw error;
      setKeys(data?.keys ?? []);
    } catch (e) {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newKeyName.trim()) {
      toast.error("Name is required");
      return;
    }
    setCreating(true);
    try {
      const origins = newKeyOrigins
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const { data, error } = await supabase.functions.invoke("manage-venue-api-keys", {
        body: {
          action: "create",
          venue_id: selectedVenueId,
          name: newKeyName.trim(),
          allowed_origins: origins,
          theme,
        },
      });
      if (error) throw error;
      setRevealedKey({ id: data.id, key: data.key });
      setNewKeyName("");
      setNewKeyOrigins("");
      await loadKeys();
      toast.success("API key created. Copy it now — it won't be shown again.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Revoke this API key? Sites using it will stop working.")) return;
    try {
      const { error } = await supabase.functions.invoke("manage-venue-api-keys", {
        body: { action: "delete", venue_id: selectedVenueId, key_id: id },
      });
      if (error) throw error;
      toast.success("API key revoked");
      await loadKeys();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to revoke key");
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  const widgetBaseUrl = `${window.location.origin}/widget/v1/widget.js`;
  const previewKey = revealedKey?.key ?? "YOUR_API_KEY";
  const embedSnippet = `<div id="nextplay-widget"></div>
<script src="${widgetBaseUrl}"></script>
<script>
  NextPlayWidget.init({
    apiKey: "${previewKey}",
    container: "#nextplay-widget"
  });
</script>`;

  return (
    <>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Code2 className="h-6 w-6" /> Booking Widget
          </h1>
          <p className="text-sm text-muted-foreground">
            Embed the booking flow on your own website with a single script tag.
          </p>
        </div>

        {venuesLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !venues || venues.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Create a venue first to generate a widget.</CardContent></Card>
        ) : (
          <>
            <div className="max-w-sm">
              <Label>Venue</Label>
              <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {venues.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="keys">
              <TabsList>
                <TabsTrigger value="keys"><Key className="h-4 w-4 mr-2" />API Keys</TabsTrigger>
                <TabsTrigger value="customize">Customize</TabsTrigger>
                <TabsTrigger value="embed">Embed Code</TabsTrigger>
              </TabsList>

              <TabsContent value="keys" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Create new key</CardTitle>
                    <CardDescription>Generate an API key to authenticate widget requests.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Name</Label>
                      <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="My website" />
                    </div>
                    <div>
                      <Label>Allowed origins (one per line, optional)</Label>
                      <Textarea
                        value={newKeyOrigins}
                        onChange={(e) => setNewKeyOrigins(e.target.value)}
                        placeholder={"example.com\nbookings.example.com"}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Leave empty to allow any origin.</p>
                    </div>
                    <Button onClick={handleCreate} disabled={creating} className="gap-2">
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Create key
                    </Button>
                  </CardContent>
                </Card>

                {revealedKey && (
                  <Card className="border-primary/40 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-base">New API key</CardTitle>
                      <CardDescription className="text-destructive">Copy this now — it will not be shown again.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Input value={revealedKey.key} readOnly className="font-mono text-xs" />
                      <Button variant="outline" size="icon" onClick={() => copy(revealedKey.key)}><Copy className="h-4 w-4" /></Button>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader><CardTitle className="text-base">Existing keys</CardTitle></CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : keys.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No keys yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {keys.map((k) => (
                          <div key={k.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{k.name}</span>
                                {k.is_active ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Disabled</Badge>}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">{k.key_prefix}…</div>
                              {k.allowed_origins.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">Origins: {k.allowed_origins.join(", ")}</div>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(k.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="customize" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Theme</CardTitle>
                    <CardDescription>Theme is stored per API key when you create it.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Primary color</Label>
                      <Input type="color" value={theme.primaryColor} onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })} />
                    </div>
                    <div>
                      <Label>Background</Label>
                      <Input type="color" value={theme.backgroundColor} onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })} />
                    </div>
                    <div>
                      <Label>Text color</Label>
                      <Input type="color" value={theme.textColor} onChange={(e) => setTheme({ ...theme, textColor: e.target.value })} />
                    </div>
                    <div>
                      <Label>Border radius (px)</Label>
                      <Input type="number" value={theme.borderRadius} onChange={(e) => setTheme({ ...theme, borderRadius: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Font family</Label>
                      <Input value={theme.fontFamily} onChange={(e) => setTheme({ ...theme, fontFamily: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="embed" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Embed snippet</CardTitle>
                    <CardDescription>Paste this into your website where the widget should appear.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto font-mono whitespace-pre-wrap">{embedSnippet}</pre>
                    <Button onClick={() => copy(embedSnippet)} className="gap-2"><Copy className="h-4 w-4" />Copy snippet</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </>
  );
}
