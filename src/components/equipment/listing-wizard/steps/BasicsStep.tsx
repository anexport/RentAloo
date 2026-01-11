import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/lib/database.types";
import SmartTip from "../components/SmartTip";
import type { WizardFormData, EquipmentCondition } from "../hooks/useListingWizard";

const CONDITIONS: { value: EquipmentCondition; label: string; description: string }[] = [
  { value: "new", label: "New", description: "Never used, original packaging" },
  { value: "excellent", label: "Excellent", description: "Like new, minimal signs of use" },
  { value: "good", label: "Good", description: "Normal wear, fully functional" },
  { value: "fair", label: "Fair", description: "Visible wear, works well" },
];

interface BasicsStepProps {
  formData: WizardFormData;
  categories: Database["public"]["Tables"]["categories"]["Row"][];
  onUpdate: <K extends keyof WizardFormData>(field: K, value: WizardFormData[K]) => void;
}

export default function BasicsStep({ formData, categories, onUpdate }: BasicsStepProps) {
  const titleLength = formData.title.length;
  const descriptionLength = formData.description.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Tell us about your equipment</h2>
        <p className="text-muted-foreground">
          Help renters understand what you're offering with a clear title and detailed description.
        </p>
      </div>

      {/* Title */}
      <div className="space-y-3">
        <Label htmlFor="title" className="text-base font-medium">
          What are you listing?
        </Label>
        <Input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => onUpdate("title", e.target.value)}
          placeholder="e.g., Professional Canon EOS R5 Camera Kit"
          className="text-lg h-12"
          maxLength={100}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Be specific - include brand and model if applicable</span>
          <span>{titleLength}/100</span>
        </div>
      </div>

      {/* Category and Condition Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Category */}
        <div className="space-y-3">
          <Label htmlFor="category" className="text-base font-medium">
            Category
          </Label>
          <Select
            value={formData.category_id}
            onValueChange={(value) => onUpdate("category_id", value)}
          >
            <SelectTrigger id="category" className="h-12">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Condition */}
        <div className="space-y-3">
          <Label htmlFor="condition" className="text-base font-medium">
            Condition
          </Label>
          <Select
            value={formData.condition}
            onValueChange={(value) => onUpdate("condition", value as EquipmentCondition)}
          >
            <SelectTrigger id="condition" className="h-12">
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((condition) => (
                <SelectItem key={condition.value} value={condition.value}>
                  <div className="flex flex-col">
                    <span>{condition.label}</span>
                    <span className="text-xs text-muted-foreground">{condition.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-3">
        <Label htmlFor="description" className="text-base font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onUpdate("description", e.target.value)}
          placeholder="Describe your equipment in detail. Include key features, what's included, any requirements for renters, and what makes it great for their needs..."
          rows={6}
          className="resize-none text-base leading-relaxed"
          maxLength={2000}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {descriptionLength < 10 ? (
              <span className="text-amber-600">Minimum 10 characters required</span>
            ) : descriptionLength < 100 ? (
              <span className="text-amber-600">Add more detail for better results</span>
            ) : (
              <span className="text-emerald-600">Great description length!</span>
            )}
          </span>
          <span>{descriptionLength}/2000</span>
        </div>
      </div>

      {/* Smart Tip */}
      <SmartTip variant="tip">
        <strong>Pro tip:</strong> Mention what makes your equipment special, any included
        accessories, and ideal use cases. Listings with detailed descriptions get 40% more
        inquiries.
      </SmartTip>

      {/* Description Helpers */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-medium text-foreground mb-3">What to include in your description:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Key features and specifications</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>What's included (accessories, cases)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Ideal use cases or projects</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Any experience requirements</span>
          </div>
        </div>
      </div>
    </div>
  );
}
