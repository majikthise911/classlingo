"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PROVIDERS, getModelsForProvider, getDefaultModels } from "@/lib/llm/providers";
import type { UserProfile } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [provider, setProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [generationModel, setGenerationModel] = useState("");
  const [feedbackModel, setFeedbackModel] = useState("");
  const [dailyGoal, setDailyGoal] = useState(5);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("user_profile")
      .select("*")
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setProvider(data.llm_provider || "anthropic");
          setApiKey(data.api_key || "");
          setGenerationModel(data.generation_model || "");
          setFeedbackModel(data.feedback_model || "");
          setDailyGoal(data.daily_goal_minutes || 5);
        }
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When provider changes, reset models to defaults if current models aren't in the new list
  useEffect(() => {
    const models = getModelsForProvider(provider);
    const defaults = getDefaultModels(provider);
    if (!models.includes(generationModel)) setGenerationModel(defaults.generation);
    if (!models.includes(feedbackModel)) setFeedbackModel(defaults.feedback);
  }, [provider]); // eslint-disable-line react-hooks/exhaustive-deps

  const models = getModelsForProvider(provider);

  async function handleSave() {
    setSaving(true);
    setSaveMessage("");
    const { error } = await supabase
      .from("user_profile")
      .update({
        llm_provider: provider,
        api_key: apiKey,
        generation_model: generationModel,
        feedback_model: feedbackModel,
        daily_goal_minutes: dailyGoal,
      })
      .eq("id", profile?.id);

    if (error) {
      setSaveMessage(`Error: ${error.message}`);
    } else {
      setSaveMessage("Settings saved!");
    }
    setSaving(false);
    setTimeout(() => setSaveMessage(""), 3000);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/llm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, model: feedbackModel }),
      });
      const data = await res.json();
      setTestResult({ ok: res.ok, message: data.message || data.error });
    } catch (e) {
      setTestResult({ ok: false, message: `Connection failed: ${e}` });
    }
    setTesting(false);
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Provider */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">LLM Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROVIDERS).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              placeholder={`Enter your ${PROVIDERS[provider]?.displayName} API key`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Models */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Models</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Generation model (exercises, topic labeling, WES)</Label>
            <Select value={generationModel} onValueChange={setGenerationModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Feedback model (answer feedback, grading)</Label>
            <Select value={feedbackModel} onValueChange={setFeedbackModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Daily Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Goal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[5, 10, 15].map((mins) => (
              <Button
                key={mins}
                variant={dailyGoal === mins ? "default" : "outline"}
                onClick={() => setDailyGoal(mins)}
                className="flex-1"
              >
                {mins} min
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button onClick={handleSave} className="w-full" size="lg" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Settings
        </Button>
        {saveMessage && (
          <p className={`text-center text-sm ${saveMessage.startsWith("Error") ? "text-destructive" : "text-success"}`}>
            {saveMessage}
          </p>
        )}

        <Button onClick={handleTest} variant="outline" className="w-full" size="lg" disabled={testing || !apiKey}>
          {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Test LLM Connection
        </Button>
        {testResult && (
          <div className={`flex items-center gap-2 justify-center text-sm ${testResult.ok ? "text-success" : "text-destructive"}`}>
            {testResult.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
