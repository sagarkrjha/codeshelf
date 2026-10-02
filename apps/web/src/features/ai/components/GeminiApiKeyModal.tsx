import React, { useState } from 'react';
import {
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import {
  maskApiKey,
  isValidGeminiApiKeyFormat,
  AVAILABLE_GEMINI_MODELS,
  DEFAULT_GEMINI_MODEL,
} from '@codeshelf/shared';
import { getLocalConfig, saveLocalConfig } from '../../storage/storage';

interface GeminiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function GeminiApiKeyModal({ isOpen, onClose, onSaved }: GeminiApiKeyModalProps) {
  const currentConfig = getLocalConfig();
  const [apiKeyInput, setApiKeyInput] = useState(currentConfig.geminiApiKey || '');
  const [selectedModel, setSelectedModel] = useState(currentConfig.geminiModel || DEFAULT_GEMINI_MODEL);
  const [showKey, setShowKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const currentMasked = maskApiKey(currentConfig.geminiApiKey);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();

    if (!cleanKey) {
      setErrorMsg('Please enter an API key or use Clear to remove it.');
      return;
    }

    if (!isValidGeminiApiKeyFormat(cleanKey)) {
      setErrorMsg('Invalid key format. Please enter a valid Gemini API key without whitespace.');
      return;
    }

    setErrorMsg('');
    saveLocalConfig({
      geminiApiKey: cleanKey,
      geminiModel: selectedModel,
    });
    setSuccessMsg('Gemini settings saved safely in ~/.codeshelf/config.json! ✨');

    setTimeout(() => {
      setSuccessMsg('');
      if (onSaved) onSaved();
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    saveLocalConfig({ geminiApiKey: undefined });
    setApiKeyInput('');
    setSuccessMsg('Gemini API key removed from config.');
    setTimeout(() => {
      setSuccessMsg('');
      if (onSaved) onSaved();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border-color rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-color flex items-center justify-between bg-bg-tertiary">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-main leading-tight">Gemini API Key</h3>
              <p className="text-[11px] text-text-muted mt-0.5">Stored safely in ~/.codeshelf/config.json</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-main p-1 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 flex flex-col gap-4">
          {currentMasked ? (
            <div className="bg-bg-primary/80 border border-border-color rounded-lg p-3 text-xs flex items-center justify-between">
              <div>
                <span className="text-text-muted block text-[11px]">Active Key:</span>
                <span className="font-mono text-emerald-400 font-semibold">{currentMasked}</span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="btn text-xs py-1 px-2 text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-500/10 flex items-center gap-1"
                title="Remove API key"
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>
          ) : (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 leading-relaxed">
              Enter your Google Gemini API key to enable AI Autofill and conventional commit generation.
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-2.5 rounded-lg flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs p-2.5 rounded-lg flex items-center gap-2">
              <Check size={14} className="shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-main flex items-center justify-between">
              <span>{currentMasked ? 'Update API Key' : 'Enter API Key'}</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-accent hover:underline inline-flex items-center gap-1"
              >
                Get free key <ExternalLink size={10} />
              </a>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-text-muted">
                <Key size={14} />
              </div>
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="AIzaSy..."
                className="search-input w-full pl-8 pr-9 py-2 text-xs font-mono"
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setErrorMsg('');
                }}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-text-main cursor-pointer"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Model Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-main flex items-center justify-between">
              <span>Gemini Model</span>
              <span className="text-[10px] text-emerald-400 font-mono">Latest Generation</span>
            </label>
            <select
              className="search-input w-full px-2.5 py-2 text-xs bg-bg-primary text-text-main border border-border-color rounded-lg cursor-pointer"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {AVAILABLE_GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-text-muted leading-normal">
            Safety guarantee: Your key remains completely local in your central profile (<code className="text-text-main font-mono">~/.codeshelf/config.json</code>). It is never sent to any third-party servers.
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-color mt-1">
            <button
              type="button"
              className="btn text-xs py-1.5 px-3"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary text-xs py-1.5 px-4 font-semibold flex items-center gap-1.5"
            >
              <Check size={13} /> Save Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
