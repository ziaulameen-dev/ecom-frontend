'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  ChevronDown,
  Edit2,
  HelpCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { confirm } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AutoReplyRule } from '../types';

export const INITIAL_AUTO_REPLY_RULES: AutoReplyRule[] = [
  {
    id: 'greeting',
    name: 'Greetings & Welcome',
    category: 'General',
    triggers: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'good afternoon', 'help me', 'namaste'],
    reply:
      '👋 Hello! Welcome to support. How can we assist you today? You can ask us about your orders, tracking, returns, shipping, or products.',
    enabled: true,
  },
];

const STORAGE_KEY = 'ecom_auto_reply_rules_v2';

interface AutoReplyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutoReplyDrawer({ open, onOpenChange }: AutoReplyDrawerProps) {
  const [rules, setRules] = useState<AutoReplyRule[]>(INITIAL_AUTO_REPLY_RULES);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // New rule draft state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [newTriggers, setNewTriggers] = useState<string[]>([]);
  const [newReply, setNewReply] = useState('');

  // Editing state
  const [editTriggers, setEditTriggers] = useState<string[]>([]);
  const [editKeywordInput, setEditKeywordInput] = useState('');
  const [editReply, setEditReply] = useState('');

  // Load rules from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRules(parsed);
          return;
        }
      }
    } catch {}
    setRules(INITIAL_AUTO_REPLY_RULES);
  }, []);

  // Save helper
  const persistRules = (updated: AutoReplyRule[]) => {
    setRules(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('ecom_auto_reply_rules_updated', { detail: updated }));
    } catch {}
  };

  // Toggle rule enable/disable
  const handleToggleRule = (id: string) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    persistRules(updated);
    const target = updated.find((r) => r.id === id);
    toast.success(`${target?.name} ${target?.enabled ? 'enabled' : 'disabled'}`);
  };

  // Delete rule with confirmation
  const handleDeleteRule = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      description: `Are you sure you want to delete this automated response rule? Storefront customers sending matching trigger keywords will no longer receive this automatic reply.`,
      confirmText: 'Delete Rule',
      cancelText: 'Cancel',
      destructive: true,
    });
    if (!ok) return;

    const updated = rules.filter((r) => r.id !== id);
    persistRules(updated);
    if (editingRuleId === id) {
      setEditingRuleId(null);
    }
    toast.success(`Removed auto-reply rule "${name}"`);
  };

  // Cancel new rule draft (with confirmation if unsaved input exists)
  const handleCancelNew = async () => {
    if (newName.trim() || newReply.trim() || newTriggers.length > 0) {
      const ok = await confirm({
        title: 'Discard new rule?',
        description: 'You have unsaved details for this new rule. Are you sure you want to discard them?',
        confirmText: 'Discard',
        cancelText: 'Keep Editing',
        destructive: true,
      });
      if (!ok) return;
    }
    setIsAddingNew(false);
    setNewName('');
    setNewCategory('General');
    setNewKeywordInput('');
    setNewTriggers([]);
    setNewReply('');
  };

  // Cancel editing rule (with confirmation if changes exist)
  const handleCancelEdit = async (rule: AutoReplyRule) => {
    const hasChanges =
      editReply.trim() !== rule.reply.trim() ||
      editTriggers.length !== rule.triggers.length ||
      editTriggers.some((t) => !rule.triggers.includes(t));

    if (hasChanges) {
      const ok = await confirm({
        title: 'Discard unsaved changes?',
        description: `You have unsaved changes in "${rule.name}". Are you sure you want to discard them?`,
        confirmText: 'Discard',
        cancelText: 'Keep Editing',
        destructive: true,
      });
      if (!ok) return;
    }
    setEditingRuleId(null);
  };

  // Start editing a rule
  const handleStartEdit = (rule: AutoReplyRule) => {
    setEditingRuleId(rule.id);
    setEditTriggers([...rule.triggers]);
    setEditKeywordInput('');
    setEditReply(rule.reply);
  };

  // Save edited rule
  const handleSaveEdit = (id: string) => {
    if (!editReply.trim()) {
      toast.error('Automated reply message cannot be empty');
      return;
    }
    if (editTriggers.length === 0) {
      toast.error('Add at least one trigger keyword');
      return;
    }

    const updated = rules.map((r) =>
      r.id === id
        ? {
            ...r,
            triggers: editTriggers,
            reply: editReply.trim(),
          }
        : r,
    );
    persistRules(updated);
    setEditingRuleId(null);
    toast.success('Rule changes saved successfully');
  };

  // Add keyword to draft
  const handleAddDraftKeyword = () => {
    const kw = newKeywordInput.trim().toLowerCase();
    if (!kw) return;
    if (newTriggers.includes(kw)) {
      toast.error('Keyword already added');
      return;
    }
    setNewTriggers([...newTriggers, kw]);
    setNewKeywordInput('');
  };

  // Add keyword to edit
  const handleAddEditKeyword = () => {
    const kw = editKeywordInput.trim().toLowerCase();
    if (!kw) return;
    if (editTriggers.includes(kw)) {
      toast.error('Keyword already added');
      return;
    }
    setEditTriggers([...editTriggers, kw]);
    setEditKeywordInput('');
  };

  // Save new rule
  const handleSaveNewRule = () => {
    if (!newName.trim()) {
      toast.error('Please enter a rule name');
      return;
    }
    if (!newReply.trim()) {
      toast.error('Please enter an automated reply message');
      return;
    }
    if (newTriggers.length === 0) {
      toast.error('Please add at least one trigger keyword');
      return;
    }

    const newRule: AutoReplyRule = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      category: newCategory.trim() || 'General',
      triggers: newTriggers,
      reply: newReply.trim(),
      enabled: true,
      isCustom: true,
    };

    const updated = [newRule, ...rules];
    persistRules(updated);
    setIsAddingNew(false);
    setNewName('');
    setNewCategory('General');
    setNewKeywordInput('');
    setNewTriggers([]);
    setNewReply('');
    toast.success(`Created new auto-reply rule "${newRule.name}"`);
  };

  // Filtered rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (categoryFilter !== 'all' && (r.category || 'General').toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesTriggers = r.triggers.some((t) => t.toLowerCase().includes(q));
        const matchesReply = r.reply.toLowerCase().includes(q);
        if (!matchesName && !matchesTriggers && !matchesReply) return false;
      }
      return true;
    });
  }, [rules, categoryFilter, searchQuery]);

  const activeCount = rules.filter((r) => r.enabled).length;

  const categories = useMemo(() => {
    const set = new Set<string>();
    rules.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return ['all', ...Array.from(set)];
  }, [rules]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="p-0 md:p-0 flex flex-col h-[90vh] max-h-[90vh] md:h-full md:max-h-none md:max-w-md bg-background border-t md:border-t-0 md:border-l shadow-2xl overflow-hidden rounded-t-2xl md:rounded-none">
        {/* Top Header */}
        <div className="border-b px-4 pt-3 pb-3 sm:px-6 sm:py-4 shrink-0 bg-card">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#187b7b]/10 text-[#187b7b] shrink-0">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <DrawerTitle className="text-sm sm:text-base font-bold text-foreground truncate">
                    Automated Responses
                  </DrawerTitle>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-emerald-600 border border-emerald-500/20 shrink-0">
                    {activeCount} Active
                  </span>
                </div>
                <DrawerDescription className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                  Bot assistant replies instantly when trigger words match
                </DrawerDescription>
              </div>
            </div>

            <DrawerClose asChild>
              <button
                type="button"
                className="hidden md:flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all shrink-0 -mr-1"
                aria-label="Close auto-reply settings"
              >
                <X className="h-5 w-5" />
              </button>
            </DrawerClose>
          </div>

          {/* Quick Action Bar: Search & New Rule */}
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keywords or rules..."
                className="h-8.5 pl-8 pr-7 text-xs bg-muted/40 w-full rounded-lg border-muted-foreground/20 focus-visible:ring-[#187b7b]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => {
                if (isAddingNew) {
                  handleCancelNew();
                } else {
                  setIsAddingNew(true);
                }
              }}
              className={cn(
                'h-8.5 px-3 text-xs gap-1.5 font-semibold shrink-0 shadow-xs transition-all active:scale-95',
                isAddingNew
                  ? 'bg-muted text-foreground hover:bg-muted/80'
                  : 'bg-[#187b7b] hover:bg-[#136363] text-white',
              )}
            >
              {isAddingNew ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{isAddingNew ? 'Cancel' : 'New Rule'}</span>
            </Button>
          </div>

          {/* Category Filter Pills (displayed when multiple categories exist) */}
          {categories.length > 2 && (
            <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
              {categories.map((cat) => {
                const active = categoryFilter.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-colors shrink-0',
                      active
                        ? 'bg-[#187b7b] text-white font-semibold'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Rules Content Stream */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3 sm:space-y-4">
          {/* New Rule Creator Card */}
          {isAddingNew && (
            <div className="rounded-xl border-2 border-[#187b7b]/30 bg-card p-4 shadow-md space-y-4 animate-in fade-in-50 slide-in-from-top-2">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#187b7b]" />
                  <h3 className="text-sm font-bold text-foreground">Create New Keyword Rule</h3>
                </div>
                <button
                  type="button"
                  onClick={handleCancelNew}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Rule Name</label>
                  <Input
                    placeholder="e.g. Size Guide & Fits"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <Input
                    placeholder="e.g. Products, Shipping, General"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Trigger Keywords Builder */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Trigger Keywords</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Type keyword and press Enter</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="e.g. size chart, size guide, fit"
                      value={newKeywordInput}
                      onChange={(e) => setNewKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDraftKeyword();
                        }
                      }}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddDraftKeyword}
                    className="h-8 text-xs"
                  >
                    Add
                  </Button>
                </div>

                {newTriggers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {newTriggers.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-md bg-[#187b7b]/10 text-[#187b7b] px-2 py-0.5 text-xs font-medium border border-[#187b7b]/20"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => setNewTriggers(newTriggers.filter((x) => x !== t))}
                          className="hover:text-rose-600 rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Automated Response Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Bot Response Message</label>
                <Textarea
                  placeholder="Type the automated response message that the bot sends..."
                  rows={3}
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelNew}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveNewRule}
                  className="h-8 text-xs bg-[#187b7b] hover:bg-[#136363] text-white"
                >
                  Save Rule
                </Button>
              </div>
            </div>
          )}

          {/* Rules Cards List */}
          {filteredRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-3 px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/60">
                <Bot className="h-6 w-6 stroke-1.5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {searchQuery || categoryFilter !== 'all' ? 'No matching rules found' : 'No automated rules yet'}
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {searchQuery || categoryFilter !== 'all'
                    ? 'Try adjusting your search terms or clearing active filters.'
                    : 'Add automated replies for common greetings, questions, or keywords.'}
                </p>
              </div>
              {searchQuery || categoryFilter !== 'all' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                  }}
                  className="h-8 text-xs font-medium"
                >
                  Clear Filters
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIsAddingNew(true)}
                  className="h-8 text-xs font-medium bg-[#187b7b] hover:bg-[#136363] text-white gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Rule
                </Button>
              )}
            </div>
          ) : (
            filteredRules.map((rule) => {
              const isEditing = editingRuleId === rule.id;

              return (
                <div
                  key={rule.id}
                  className={cn(
                    'rounded-xl border bg-card p-3 sm:p-4 transition-all shadow-2xs space-y-3',
                    rule.enabled
                      ? 'border-border hover:border-[#187b7b]/40'
                      : 'opacity-65 bg-muted/20 border-border/60',
                  )}
                >
                  {/* Top Bar of Rule Card */}
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground break-words">{rule.name}</h4>
                        {rule.category && (
                          <Badge variant="secondary" className="text-[10px] font-medium h-4 px-1.5 shrink-0">
                            {rule.category}
                          </Badge>
                        )}
                        {rule.isCustom && (
                          <Badge variant="outline" className="text-[10px] font-semibold text-[#187b7b] border-[#187b7b]/30 h-4 px-1.5 shrink-0">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                        {rule.triggers.length} trigger keywords configured
                      </p>
                    </div>

                    {/* Enable / Disable Toggle Switch */}
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rule.enabled}
                        onClick={() => handleToggleRule(rule.id)}
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                          rule.enabled ? 'bg-[#187b7b]' : 'bg-muted-foreground/30',
                        )}
                        title={rule.enabled ? 'Click to disable' : 'Click to enable'}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                            rule.enabled ? 'translate-x-4' : 'translate-x-0',
                          )}
                        />
                      </button>

                      {!isEditing && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(rule)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit keywords and reply"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRule(rule.id, rule.name)}
                        className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                        title="Delete rule"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Edit Mode */}
                  {isEditing ? (
                    <div className="space-y-3 pt-2 border-t">
                      {/* Keyword editing */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                          <span>Trigger Keywords</span>
                          <span className="text-[10px] text-muted-foreground">Add or remove keywords</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Add keyword..."
                            value={editKeywordInput}
                            onChange={(e) => setEditKeywordInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddEditKeyword();
                              }
                            }}
                            className="h-7 text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleAddEditKeyword}
                            className="h-7 text-xs"
                          >
                            Add
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {editTriggers.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground border"
                            >
                              {t}
                              <button
                                type="button"
                                onClick={() => setEditTriggers(editTriggers.filter((x) => x !== t))}
                                className="text-muted-foreground hover:text-rose-600 rounded-full"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Reply message editing */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Automated Reply Message</label>
                        <Textarea
                          rows={3}
                          value={editReply}
                          onChange={(e) => setEditReply(e.target.value)}
                          className="text-xs resize-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelEdit(rule)}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSaveEdit(rule.id)}
                          className="h-7 text-xs bg-[#187b7b] hover:bg-[#136363] text-white"
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Read Mode */
                    <>
                      {/* Keyword Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {rule.triggers.map((trigger) => (
                          <span
                            key={trigger}
                            className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/50"
                          >
                            <Tag className="h-2.5 w-2.5 opacity-60" />
                            {trigger}
                          </span>
                        ))}
                      </div>

                      {/* Response Message Preview */}
                      <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground/90 border border-border/40 leading-relaxed break-words">
                        {rule.reply}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
