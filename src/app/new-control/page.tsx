// TODO: This page will be client component for form handling and AI interaction
"use client"; 

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Lightbulb } from "lucide-react";
import { suggestRelatedControls, type SuggestRelatedControlsInput, type SuggestRelatedControlsOutput } from '@/ai/flows/suggest-related-controls'; // AI Flow

export default function NewControlPage() {
  const [controlDescription, setControlDescription] = useState("");
  const [suggestedControls, setSuggestedControls] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [errorSuggestions, setErrorSuggestions] = useState<string | null>(null);

  const handleSuggestControls = async () => {
    if (!controlDescription.trim()) {
      setErrorSuggestions("Please enter a control description first.");
      return;
    }
    setIsLoadingSuggestions(true);
    setErrorSuggestions(null);
    setSuggestedControls([]);
    try {
      const input: SuggestRelatedControlsInput = { controlDescription };
      const result: SuggestRelatedControlsOutput = await suggestRelatedControls(input);
      setSuggestedControls(result.relatedControls);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setErrorSuggestions("Failed to fetch suggestions. Please try again.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: Implement form submission logic
    // This would involve creating a new ChangeRequest with status "Pending" for a new control.
    console.log("Form submitted with data:", new FormData(event.currentTarget));
    // Show toast notification on success/failure
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Control</CardTitle>
          <CardDescription>
            Fill in the details for the new control. All new controls are subject to approval.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="controlId">Control ID</Label>
                <Input id="controlId" name="controlId" placeholder="e.g., FIN-00X, IT-00Y" required />
              </div>
              <div>
                <Label htmlFor="controlName">Control Name</Label>
                <Input id="controlName" name="controlName" placeholder="Name of the control" required />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                name="description"
                placeholder="Detailed description of the control objective and activities." 
                value={controlDescription}
                onChange={(e) => setControlDescription(e.target.value)}
                required 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="controlOwner">Control Owner</Label>
                <Input id="controlOwner" name="controlOwner" placeholder="Name or department" required />
              </div>
              <div>
                <Label htmlFor="controlFrequency">Control Frequency</Label>
                <Select name="controlFrequency" required>
                  <SelectTrigger id="controlFrequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Annually">Annually</SelectItem>
                    <SelectItem value="Ad-hoc">Ad-hoc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="controlType">Control Type</Label>
                 <Select name="controlType" required>
                  <SelectTrigger id="controlType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Preventive">Preventive</SelectItem>
                    <SelectItem value="Detective">Detective</SelectItem>
                    <SelectItem value="Corrective">Corrective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
                <Label htmlFor="relatedRisks">Related Risks (comma-separated)</Label>
                <Input id="relatedRisks" name="relatedRisks" placeholder="e.g., Financial Misstatement, Unauthorized Access" />
            </div>
            <div>
                <Label htmlFor="testProcedures">Test Procedures</Label>
                <Textarea id="testProcedures" name="testProcedures" placeholder="Describe how this control is tested." />
            </div>
            <div>
                <Label htmlFor="evidenceRequirements">Evidence Requirements</Label>
                <Textarea id="evidenceRequirements" name="evidenceRequirements" placeholder="What evidence is required to prove control operation?" />
            </div>

            {/* AI-Driven Control Suggestion Section */}
            <Card className="bg-accent/20 border-accent/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-accent-foreground" />
                  AI-Suggested Related Controls
                </CardTitle>
                <CardDescription>
                  Based on the control description, here are some potentially related controls.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" onClick={handleSuggestControls} disabled={isLoadingSuggestions || !controlDescription.trim()} className="mb-4">
                  {isLoadingSuggestions && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Suggest Related Controls
                </Button>
                {errorSuggestions && <p className="text-sm text-destructive">{errorSuggestions}</p>}
                {suggestedControls.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {suggestedControls.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                )}
                {suggestedControls.length === 0 && !isLoadingSuggestions && !errorSuggestions && (
                  <p className="text-sm text-muted-foreground">Enter a description and click suggest to see related controls.</p>
                )}
              </CardContent>
            </Card>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit">Submit for Approval</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
