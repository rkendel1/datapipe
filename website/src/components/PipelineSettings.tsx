import React, { useState, useMemo, useCallback } from "react";
import { File } from "@/app/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import yaml from "js-yaml";

const OLLAMA_MODELS = [
  "mistral", "llama2", "llama3", "phi3"
] as const;

interface ModelInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions?: readonly string[];
}

export const ModelInput: React.FC<ModelInputProps> = ({
  value,
  onChange,
  placeholder,
  suggestions = OLLAMA_MODELS,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative">
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
        placeholder={placeholder}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setTimeout(() => setIsFocused(false), 200);
        }}
      />
      {isFocused &&
        (value === "" ||
          suggestions.some((model) =>
            model.toLowerCase().includes(value?.toLowerCase() || "")
          )) && (
          <div className="absolute top-full left-0 w-full mt-1 bg-popover rounded-md border shadow-md z-50 max-h-[200px] overflow-y-auto">
            {suggestions
              .filter(
                (model) =>
                  value === "" ||
                  model.toLowerCase().includes(value.toLowerCase())
              )
              .map((model) => (
                <div
                  key={model}
                  className="px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    onChange(model);
                    setIsFocused(false);
                  }}
                >
                  {model}
                </div>
              ))}
          </div>
        )}
    </div>
  );
};

interface PipelineSettingsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineName: string;
  setPipelineName: (name: string) => void;
  currentFile: File | null;
  setCurrentFile: (file: File | null) => void;
  defaultModel: string;
  setDefaultModel: (model: string) => void;
  optimizerModel: string;
  setOptimizerModel: (model: string) => void;
  autoOptimizeCheck: boolean;
  setAutoOptimizeCheck: (check: boolean) => void;
  files: File[];
  apiKeys: Array<{ name: string; value: string }>;
  extraPipelineSettings: Record<string, unknown> | null;
  setExtraPipelineSettings: (settings: Record<string, unknown> | null) => void;
}

const SAMPLE_YAML = `# Example configuration - delete or modify as needed
rate_limits:
  llm_call:
    - count: 1000000
      per: 1
      unit: minute
  llm_tokens:
    - count: 1000000000
      per: 1
      unit: minute`;

const PipelineSettings: React.FC<PipelineSettingsProps> = ({
  isOpen,
  onOpenChange,
  pipelineName,
  setPipelineName,
  currentFile,
  setCurrentFile,
  defaultModel,
  setDefaultModel,
  optimizerModel,
  setOptimizerModel,
  autoOptimizeCheck,
  setAutoOptimizeCheck,
  files,
  apiKeys,
  extraPipelineSettings,
  setExtraPipelineSettings,
}) => {
  const [tempPipelineName, setTempPipelineName] = useState(pipelineName);
  const [tempCurrentFile, setTempCurrentFile] = useState<File | null>(
    currentFile
  );
  const [tempDefaultModel, setTempDefaultModel] = useState(defaultModel);
  const [tempOptimizerModel, setTempOptimizerModel] = useState(optimizerModel);
  const [tempAutoOptimizeCheck, setTempAutoOptimizeCheck] =
    useState(autoOptimizeCheck);

  // Convert extraPipelineSettings to YAML string
  const initialYamlString = useMemo(() => {
    if (!extraPipelineSettings) {
      return "";
    }
    try {
      return yaml.dump(extraPipelineSettings);
    } catch (e) {
      console.error("Error converting settings to YAML:", e);
      return "";
    }
  }, [extraPipelineSettings]);

  const [tempYamlSettings, setTempYamlSettings] = useState(initialYamlString);
  const [yamlError, setYamlError] = useState<string | null>(null);

  // Update local state when props change
  React.useEffect(() => {
    setTempPipelineName(pipelineName);
    setTempCurrentFile(currentFile);
    setTempDefaultModel(defaultModel);
    setTempOptimizerModel(optimizerModel);
    setTempAutoOptimizeCheck(autoOptimizeCheck);

    // Update YAML when extraPipelineSettings changes
    if (extraPipelineSettings) {
      try {
        setTempYamlSettings(yaml.dump(extraPipelineSettings));
      } catch (e) {
        console.error("Error converting settings to YAML:", e);
      }
    } else {
      setTempYamlSettings("");
    }
  }, [
    pipelineName,
    currentFile,
    defaultModel,
    optimizerModel,
    autoOptimizeCheck,
    extraPipelineSettings,
  ]);

  const validateYaml = useCallback((yamlString: string) => {
    if (!yamlString.trim()) {
      setYamlError(null);
      return null;
    }

    try {
      const parsed = yaml.load(yamlString);
      setYamlError(null);
      return parsed as Record<string, unknown>;
    } catch (e) {
      const error = e as Error;
      setYamlError(`Invalid YAML: ${error.message}`);
      return null;
    }
  }, []);

  const handleYamlChange = useCallback(
    (value: string) => {
      setTempYamlSettings(value);
      validateYaml(value);
    },
    [validateYaml]
  );

  const handleSettingsSave = () => {
    setPipelineName(tempPipelineName);
    setCurrentFile(tempCurrentFile);
    setDefaultModel(tempDefaultModel);
    setOptimizerModel(tempOptimizerModel);
    setAutoOptimizeCheck(tempAutoOptimizeCheck);

    // Process and save YAML settings
    if (tempYamlSettings.trim()) {
      const parsedSettings = validateYaml(tempYamlSettings);
      if (parsedSettings) {
        setExtraPipelineSettings(parsedSettings);
      }
    } else {
      setExtraPipelineSettings(null);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pipeline Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="pipelineName">Pipeline Name</Label>
            <Input
              id="pipelineName"
              value={tempPipelineName}
              onChange={(e) => setTempPipelineName(e.target.value)}
              placeholder="Enter pipeline name"
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="currentFile">Dataset JSON</Label>
            <Select
              value={tempCurrentFile?.path || ""}
              onValueChange={(value) =>
                setTempCurrentFile(
                  files.find((file) => file.path === value) || null
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a file" />
              </SelectTrigger>
              <SelectContent>
                {files
                  .filter((file) => file.type === "json")
                  .map((file) => (
                    <SelectItem key={file.path} value={file.path}>
                      {file.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="defaultModel">Default Model</Label>
            <ModelInput
              value={tempDefaultModel}
              onChange={setTempDefaultModel}
              placeholder="Enter or select a model (e.g. mistral, llama2, phi3)..."
            />
            <p className="text-xs text-muted-foreground">
              Enter the name of an <b>Ollama</b> model running locally. For best results, use <code>mistral</code> or try <code>llama2</code>, <code>llama3</code>, <code>phi3</code> (must be pulled with Ollama).<br />
              Ensure you have OLLAMA_API_BASE set to <code>http://host.docker.internal:11434</code> (for Docker).
            </p>
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="optimize">Optimizer Model</Label>
            <ModelInput
              value={tempOptimizerModel}
              onChange={setTempOptimizerModel}
              placeholder="Enter optimizer model name (e.g. mistral)..."
              suggestions={OLLAMA_MODELS}
            />
            <p className="text-xs text-muted-foreground">
              Enter the name of an Ollama model for optimizer tasks.<br />
              The same restrictions apply as above: simple schemas work best for local models.
            </p>
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="autoOptimize">
              Automatically Check Whether to Optimize
            </Label>
            <Switch
              id="autoOptimize"
              checked={tempAutoOptimizeCheck}
              onCheckedChange={(checked) => setTempAutoOptimizeCheck(checked)}
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="advancedSettings">
                Advanced Pipeline Settings (YAML)
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setTempYamlSettings(SAMPLE_YAML)}
              >
                Add Example
              </Button>
            </div>
            <Textarea
              id="advancedSettings"
              value={tempYamlSettings}
              onChange={(e) => handleYamlChange(e.target.value)}
              placeholder="Enter YAML configuration for rate limits and other advanced settings"
              className="font-mono text-sm h-48 resize-y"
            />
            {yamlError && (
              <div className="text-sm text-destructive">{yamlError}</div>
            )}
            <p className="text-sm text-muted-foreground">
              Configure rate limits and other advanced settings in YAML format.
              These settings will be passed to the backend.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSettingsSave}
            disabled={!!yamlError && tempYamlSettings.trim() !== ""}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PipelineSettings;
