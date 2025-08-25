import { useState, useMemo } from 'react';
import { Plus, Trash2, Download, Upload, FileText, Copy, BarChart3, TrendingUp, Target, Sparkles, GripVertical, CheckSquare, Square, Lightbulb, Zap, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MainTarget, BulkInputResult } from '@/types/keyword';
import { useToast } from '@/hooks/use-toast';
import { KeywordItem } from './KeywordItem';
import { cn, capitalizeWords } from '@/lib/utils';
import { BulkOperations } from './BulkOperations';
import { KeywordTemplates } from './KeywordTemplates';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface KeywordManagerProps {
  selectedTarget: MainTarget | null;
  onAddKeywords: (mainTargetId: string, keywords: string[]) => BulkInputResult;
  onRemoveKeyword: (mainTargetId: string, keyword: string) => void;
  onUpdateTarget: (id: string, updates: Partial<MainTarget>) => void;
}

export const KeywordManager = ({
  selectedTarget,
  onAddKeywords,
  onRemoveKeyword,
  onUpdateTarget,
}: KeywordManagerProps) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [bulkKeywords, setBulkKeywords] = useState('');
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isDragMode, setIsDragMode] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate keyword statistics
  const keywordStats = useMemo(() => {
    if (!selectedTarget) return null;
    
    const totalKeywords = selectedTarget.relevantKeywords.length;
    const avgLength = totalKeywords > 0 
      ? Math.round(selectedTarget.relevantKeywords.reduce((sum, kw) => sum + kw.length, 0) / totalKeywords)
      : 0;
    
    const longestKeyword = selectedTarget.relevantKeywords.reduce(
      (longest, current) => current.length > longest.length ? current : longest,
      ''
    );
    
    const shortestKeyword = selectedTarget.relevantKeywords.reduce(
      (shortest, current) => current.length < shortest.length ? current : shortest,
      selectedTarget.relevantKeywords[0] || ''
    );

    return {
      totalKeywords,
      avgLength,
      longestKeyword,
      shortestKeyword,
      daysActive: Math.floor((Date.now() - selectedTarget.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    };
  }, [selectedTarget]);

  if (!selectedTarget) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background to-accent/20">
        <div className="text-center max-w-md">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-pinterest/20 to-pinterest-red-dark/20 rounded-full blur-xl"></div>
            <div className="relative bg-card p-6 rounded-full shadow-soft">
              <Target className="h-16 w-16 text-pinterest mx-auto float" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2 text-gradient">Ready to Target Keywords?</h3>
          <p className="text-muted-foreground mb-4">
            Select a main target keyword from the sidebar to start managing its relevant keywords and boost your Pinterest strategy.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-pinterest" />
            <span>Pinterest SEO made simple</span>
          </div>
        </div>
      </div>
    );
  }

  const handleAddSingleKeyword = () => {
    if (!newKeyword.trim()) return;

    // Parse keywords from textarea (support both line breaks and commas)
    const keywords = newKeyword
      .split(/[,\n]/)
      .map(k => capitalizeWords(k.trim()))
      .filter(k => k.length > 0);

    const result = onAddKeywords(selectedTarget.id, keywords);
    
    let message = '';
    if (result.added.length > 0) {
      message += `${result.added.length} keyword${result.added.length > 1 ? 's' : ''} added. `;
    }
    if (result.duplicates.length > 0) {
      message += `${result.duplicates.length} duplicate${result.duplicates.length > 1 ? 's' : ''} skipped. `;
    }

    toast({
      title: "Keywords Added",
      description: message.trim(),
    });

    setNewKeyword('');
  };

  const handleBulkAdd = () => {
    if (!bulkKeywords.trim()) return;

    const keywords = bulkKeywords
      .split('\n')
      .map(k => capitalizeWords(k.trim()))
      .filter(k => k.length > 0);

    const result = onAddKeywords(selectedTarget.id, keywords);
    
    let message = '';
    if (result.added.length > 0) {
      message += `${result.added.length} keywords added. `;
    }
    if (result.duplicates.length > 0) {
      message += `${result.duplicates.length} duplicates skipped. `;
    }
    if (result.skipped.length > 0) {
      message += `${result.skipped.length} empty lines skipped.`;
    }

    toast({
      title: "Bulk Import Complete",
      description: message.trim(),
    });

    setBulkKeywords('');
    setIsBulkDialogOpen(false);
  };

  const handleUpdateName = () => {
    if (editedName.trim() && editedName.trim() !== selectedTarget.name) {
      onUpdateTarget(selectedTarget.id, { name: editedName.trim() });
      toast({
        title: "Target Updated",
        description: "Main target name has been updated.",
      });
    }
    setIsEditingName(false);
  };

  const exportKeywords = () => {
    const content = `Main Target: ${selectedTarget.name}\n\nRelevant Keywords:\n${selectedTarget.relevantKeywords.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTarget.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_keywords.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const csvContent = `Main Target,Relevant Keywords\n"${selectedTarget.name}","${selectedTarget.relevantKeywords.join(', ')}"`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTarget.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_keywords.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyAllKeywords = async () => {
    try {
      await navigator.clipboard.writeText(selectedTarget.relevantKeywords.join('\n'));
      toast({
        title: "Keywords Copied",
        description: "All relevant keywords have been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy keywords to clipboard.",
        variant: "destructive",
      });
    }
  };

  // Drag and drop functions
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selectedTarget.relevantKeywords.indexOf(active.id as string);
      const newIndex = selectedTarget.relevantKeywords.indexOf(over.id as string);
      
      const newKeywords = arrayMove(selectedTarget.relevantKeywords, oldIndex, newIndex);
      onUpdateTarget(selectedTarget.id, { relevantKeywords: newKeywords });
      
      toast({
        title: "Keywords Reordered",
        description: "Keyword order has been updated.",
      });
    }
  };

  // Bulk operations
  const handleToggleSelect = (keyword: string, selected: boolean) => {
    setSelectedKeywords(prev => 
      selected 
        ? [...prev, keyword]
        : prev.filter(k => k !== keyword)
    );
  };

  const handleSelectAll = () => {
    setSelectedKeywords([...selectedTarget.relevantKeywords]);
  };

  const handleDeselectAll = () => {
    setSelectedKeywords([]);
  };

  const handleDeleteSelected = () => {
    selectedKeywords.forEach(keyword => {
      onRemoveKeyword(selectedTarget.id, keyword);
    });
    setSelectedKeywords([]);
  };

  const handleCopySelected = async () => {
    try {
      await navigator.clipboard.writeText(selectedKeywords.join('\n'));
      toast({
        title: "Selected Keywords Copied",
        description: `${selectedKeywords.length} keywords copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy keywords to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleExportSelected = () => {
    const content = `Selected Keywords from: ${selectedTarget.name}\n\n${selectedKeywords.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTarget.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_selected_keywords.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEditKeyword = (oldKeyword: string, newKeyword: string) => {
    const keywords = [...selectedTarget.relevantKeywords];
    const index = keywords.indexOf(oldKeyword);
    if (index !== -1) {
      keywords[index] = newKeyword;
      onUpdateTarget(selectedTarget.id, { relevantKeywords: keywords });
      toast({
        title: "Keyword Updated",
        description: "Keyword has been updated successfully.",
      });
    }
  };

  const handleAddFromTemplate = (templateKeywords: string[]) => {
    const result = onAddKeywords(selectedTarget.id, templateKeywords);
    
    let message = '';
    if (result.added.length > 0) {
      message += `${result.added.length} keywords added from template. `;
    }
    if (result.duplicates.length > 0) {
      message += `${result.duplicates.length} duplicates skipped. `;
    }

    toast({
      title: "Template Applied",
      description: message.trim(),
    });
  };

  const handleGeneratePrompt = async () => {
    const seoPrompt = `Write a 1,500-word SEO article titled ${selectedTarget.name} recipe that is both engaging and informative. The article must be written as if you are having a friendly, informal conversation with a fellow enthusiast. Ensure that every instruction below is followed precisely, producing a final output that is dynamic, user-friendly, and thoroughly human in its tone and style.     

Style & Tone Requirements:
Conversational and Informal:
Write as if you're talking to a friend. The tone should be relaxed, engaging, and approachable.
Use everyday language; avoid overly formal or academic language.
Ensure the narrative flows naturally and doesn't sound scripted or robotic.
Occasional Sarcasm & Humor:
Inject light sarcasm and humor to keep the reader engaged. Use these elements sparingly—only enough to maintain a playful tone without overwhelming the content.
The humor should be witty and subtle; ensure it does not detract from the main points.
Personal Touch and Experience:
Include personal opinions or anecdotes where relevant. This adds authenticity and builds trust with the reader.
When describing features or comparing products, mention personal experiences to make the content more relatable.
Active Voice Only:
Write every sentence in the active voice. For example, use "I love this feature" instead of "This feature is loved by many."
Double-check your sentences to avoid any passive constructions.
Engagement Through Rhetorical Questions:
Insert rhetorical questions throughout the article to engage the reader and provoke thought. For example: "Ever wondered why this works so well?"
These questions should serve as conversation starters and not be overused.
Use of Slang & Abbreviations:
Occasionally incorporate common internet slang such as "FYI", "IMO", etc., as well as a few emoticons (e.g., ":)" or ":/").
Limit these to 2–3 instances per article to keep the content playful yet professional.

Formatting & Structural Requirements:
Introduction:
Begin with a short, punchy introduction that immediately hooks the reader.
Avoid generic openers like "In today's world.." or dive into"
The introduction should quickly address the reader's needs and set the tone for the rest of the article.
Headings and Subheadings:
Organize the article using H2 headings for each major section or point.
Use H3 headings to break down subtopics within each H2 section when necessary.
Ensure the headings are clear and descriptive to guide the reader through the content.
Paragraph Structure:
Keep paragraphs short and punchy—ideally 3–4 sentences per paragraph.
Avoid long blocks of text to ensure readability on both desktop and mobile devices.
Each paragraph should be focused and convey a single idea clearly.
Bullet Points & Lists:
When presenting technical details, features, or comparisons, use bullet points or numbered lists.
These lists should break down information in an easy-to-digest format.
Bold Key Information:
Throughout the article, bold the most important points, features, or pieces of information. This helps draw the reader's attention to the essential parts of your message.

Content and SEO Requirements:
Conciseness and Clarity:
Every sentence should contribute directly to the article's purpose. Avoid filler phrases such as "dive into" or "in modern times."
Be clear and direct—every point should have a reason for being there.
Comparative and Opinion-Based Commentary:
When comparing products, techniques, or ideas, include clear and honest comparisons that offer genuine insights.
Support your opinions with logical reasoning and, when possible, real-life examples.
SEO Optimization:
Ensure the content is optimized for SEO by naturally including relevant keywords related to ${selectedTarget.name} recipe.
The language should be SEO-friendly without sacrificing readability or the conversational tone.
Avoid AI Fluff:
Do not include generic, AI-generated "fluff" such as overly used phrases like "dive into" or clichés.
The writing must be human, direct, and purposeful, ensuring that every word adds value.

Detailed Writing Instructions:
Introduction Section:
Open with a captivating hook. Immediately address the reader's needs or concerns related to article title
State your personal connection or experience with the topic if possible.
Main Body:
Divide the main content into multiple sections, each introduced by an H2 heading.
Within each section, use H3 subheadings where necessary to break down complex ideas.
Incorporate bullet points or numbered lists for technical details or feature comparisons.
Bold important terms, key features, or takeaways to emphasize their importance.
Tone and Engagement:
Maintain a conversational tone by writing as though you're chatting with a friend.
Use rhetorical questions throughout to encourage reader engagement.
Occasionally inject a touch of sarcasm or witty humor to make the article enjoyable without undermining its professionalism.
Sprinkle in internet slang (e.g., "FYI", "IMO") and emoticons no more than 2–3 times in the entire article.
Sentence Structure:
Write in a clear, active voice. Ensure every sentence is dynamic and direct.
Avoid complex, multi-clause sentences that might dilute the clarity of your points.
Each paragraph should be concise—aim for 3–4 sentences per paragraph to ensure readability.
Conclusion:
End with a concise summary that reiterates the key points.
Offer a final, engaging thought or call to action that encourages the reader to reflect or take the next step.
Leave the reader with a memorable final impression, perhaps by reintroducing a humorous or personal touch.

Try to include these given keywords naturally in the content:

${selectedTarget.relevantKeywords.join('\n')}

Word count must be over 1000 words. Make sure to increase the length of making process by going into more detail and easy wording. Don't bold the ingredients. Don't use emoji icons at all.

Also Give me 50 words short summary of recipe, ingredients list and making process list after the article. and some more engaging titles ideas under 65 characters as well`;

    try {
      await navigator.clipboard.writeText(seoPrompt);
      toast({
        title: "SEO Prompt Generated",
        description: "Customized SEO article prompt has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy prompt to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleGeneratePinterestPrompt = async () => {
    const slugifiedKeyword = selectedTarget.name.toLowerCase().replace(/\s+/g, '-');
    const pinterestPrompt = `Create 15 high-quality, SEO-optimized Pinterest title and description for the following URL: 

https://example.com/${slugifiedKeyword}

Include the following keywords (choose the most suitable ones):

${selectedTarget.relevantKeywords.join('\n')}

The Title should be catchy, include relevant long-tail keywords naturally, and stay under 70 characters. 

The description must be 400-500 characters long, naturally incorporating 4-5 keywords while ensuring no word is repeated more than twice. Use bold text for keywords. 

Add one emoji in title and one in description and all add CTA in description. Also add hashtags.`;

    try {
      await navigator.clipboard.writeText(pinterestPrompt);
      toast({
        title: "Pinterest Prompt Generated",
        description: "Customized Pinterest prompt has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy prompt to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateImagePrompt = async () => {
    const hooks = [
      "Craving Something Delicious?",
      "Your Next Favorite Recipe Starts Here",
      "Stop Scrolling! Dinner Inspiration Awaits…",
      "Quick. Easy. Irresistible.",
      "Discover the Secret to Flavorful Meals",
      "Cooking Made Simple (and Delicious!)",
      "Hungry? Let's Fix That",
      "A Recipe You'll Want to Save & Share!",
      "Tired of the Same Old Meals? Try This",
      "From Kitchen to Table in No Time!"
    ];

    const ctas = [
      "Tap to Get the Full Recipe & Instructions!",
      "Pin Now – Cook Later",
      "Follow for More Yummy Recipe Ideas",
      "Your Family Will Thank You – Save This!",
      "Easy Enough for Weeknights, Delicious Enough for Guests",
      "Try It Today & Impress Everyone!",
      "One Recipe You'll Keep Coming Back To",
      "Don't Just Look… Taste It! Get Recipe",
      "Click for the Step-by-Step Guide",
      "Add This to Your Weekly Meal Plan"
    ];

    const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
    const randomCta = ctas[Math.floor(Math.random() * ctas.length)];

    const imagePrompt = `Make a compelling and attractive Pinterest Pin on the topic "${selectedTarget.name}". Make a collage of two images one on top and one on bottom and there is a text written in the center with solid color background which consist three parts:
first line contains:"${randomHook}" in simple and bold and compelling text.
second line contains: "${selectedTarget.name} Recipe" in larger text and noticeable font,
third line contains: "${randomCta}"  in handwritting font but liitle smaller the second line.

Use color scheme very much aligning with the recipe.`;

    try {
      await navigator.clipboard.writeText(imagePrompt);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy prompt to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          {isEditingName ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="text-xl font-bold border-pinterest focus:border-pinterest"
                autoFocus
              />
              <Button onClick={handleUpdateName} variant="pinterest" size="sm">
                Save
              </Button>
              <Button 
                onClick={() => setIsEditingName(false)} 
                variant="outline" 
                size="sm"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <h2 
              className="text-2xl font-bold cursor-pointer hover:text-pinterest transition-colors"
              onClick={() => {
                setEditedName(selectedTarget.name);
                setIsEditingName(true);
              }}
            >
              {capitalizeWords(selectedTarget.name)}
            </h2>
          )}
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportKeywords}>
              <Download className="h-4 w-4" />
              TXT
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">
            {selectedTarget.relevantKeywords.length} relevant keywords
          </Badge>
          <span>•</span>
          <span>Created {selectedTarget.createdAt.toLocaleDateString()}</span>
          <span>•</span>
          <span>Updated {selectedTarget.updatedAt.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Analytics & Quick Insights */}
        {keywordStats && keywordStats.totalKeywords > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="card-hover bg-gradient-to-br from-pinterest/5 to-pinterest-red-dark/5 border-pinterest/20">
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-6 w-6 text-pinterest mx-auto mb-2" />
                <div className="text-xl font-bold text-pinterest">{keywordStats.totalKeywords}</div>
                <div className="text-xs text-muted-foreground">Keywords</div>
              </CardContent>
            </Card>
            
            <Card className="card-hover bg-gradient-to-br from-success/5 to-success/10 border-success/20">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 text-success mx-auto mb-2" />
                <div className="text-xl font-bold text-success">{keywordStats.avgLength}</div>
                <div className="text-xs text-muted-foreground">Avg. Length</div>
              </CardContent>
            </Card>
            
            <Card className="card-hover bg-gradient-to-br from-info/5 to-info/10 border-info/20">
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 text-info mx-auto mb-2" />
                <div className="text-xl font-bold text-info">{keywordStats.daysActive}</div>
                <div className="text-xs text-muted-foreground">Days Active</div>
              </CardContent>
            </Card>
            
            <Card className="card-hover bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
              <CardContent className="p-4 text-center">
                <Zap className="h-6 w-6 text-warning mx-auto mb-2" />
                <div className="text-xl font-bold text-warning">{Math.ceil(keywordStats.totalKeywords / 10)}</div>
                <div className="text-xs text-muted-foreground">Content Ideas</div>
              </CardContent>
            </Card>

            <Card className="card-hover bg-gradient-to-br from-purple-500/5 to-purple-600/10 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                <div className="text-xl font-bold text-purple-500">{selectedKeywords.length}</div>
                <div className="text-xs text-muted-foreground">Selected</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions Bar */}
        {keywordStats && keywordStats.totalKeywords > 0 && (
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-accent/20 rounded-xl border border-border/50">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-medium">Quick Stats:</span>
                <span className="ml-2 text-muted-foreground">
                  Longest: "{keywordStats.longestKeyword.slice(0, 20)}{keywordStats.longestKeyword.length > 20 ? '...' : ''}" 
                  ({keywordStats.longestKeyword.length} chars)
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyAllKeywords}
                className="shadow-sm"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportKeywords}
                className="shadow-sm"
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>
          </div>
        )}

        {/* Add Keywords Section */}
        <Card className="mb-6 gradient-aurora relative overflow-hidden">
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>
          <CardHeader className="relative">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-pinterest" />
              Add Keywords
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            {/* Single/Multiple Keywords Input */}
            <div className="space-y-2">
              <Textarea
                placeholder="Enter relevant keywords (one per line or separated by commas)..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="min-h-[100px] resize-none glass-card"
              />
              <Button 
                onClick={handleAddSingleKeyword}
                variant="pinterest"
                disabled={!newKeyword.trim()}
                className="w-full shadow-premium"
              >
                Add Keywords
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="glass-button">
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Import
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Bulk Add Keywords</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Paste your keywords here, one per line:&#10;vegan dinner ideas&#10;plant-based meals&#10;vegan desserts&#10;healthy vegan recipes"
                      value={bulkKeywords}
                      onChange={(e) => setBulkKeywords(e.target.value)}
                      className="min-h-[200px] resize-none"
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleBulkAdd}
                        variant="pinterest"
                        className="flex-1"
                        disabled={!bulkKeywords.trim()}
                      >
                        Add Keywords
                      </Button>
                      <Button 
                        onClick={() => setIsBulkDialogOpen(false)}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <KeywordTemplates onAddKeywords={handleAddFromTemplate} />
            </div>
          </CardContent>
        </Card>

        {/* Keywords List */}
        <Card className="scroll-indicator">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                Relevant Keywords
                {selectedKeywords.length > 0 && (
                  <Badge variant="default" className="bg-pinterest text-white">
                    {selectedKeywords.length} selected
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {selectedTarget.relevantKeywords.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isDragMode}
                      onCheckedChange={setIsDragMode}
                      id="drag-mode"
                    />
                    <Label htmlFor="drag-mode" className="text-sm">
                      Reorder
                    </Label>
                  </div>
                )}
                {selectedTarget.relevantKeywords.length > 0 && (
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={selectedKeywords.length === selectedTarget.relevantKeywords.length ? handleDeselectAll : handleSelectAll}
                      className="gap-1"
                    >
                      {selectedKeywords.length === selectedTarget.relevantKeywords.length ? (
                        <Square className="h-3 w-3" />
                      ) : (
                        <CheckSquare className="h-3 w-3" />
                      )}
                      {selectedKeywords.length === selectedTarget.relevantKeywords.length ? 'Deselect' : 'Select'} All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={copyAllKeywords}
                      className="gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy All
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedTarget.relevantKeywords.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={selectedTarget.relevantKeywords}
                  strategy={verticalListSortingStrategy}
                  disabled={!isDragMode}
                >
                  <div className="space-y-2">
                    {selectedTarget.relevantKeywords.map((keyword, index) => (
                      <KeywordItem
                        key={keyword}
                        id={keyword}
                        keyword={keyword}
                        index={index}
                        isSelected={selectedKeywords.includes(keyword)}
                        onEdit={handleEditKeyword}
                        onDelete={(kw) => onRemoveKeyword(selectedTarget.id, kw)}
                        onToggleSelect={handleToggleSelect}
                        isDragMode={isDragMode}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-12">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-muted/20 to-accent/20 rounded-full blur-lg"></div>
                  <div className="relative bg-muted/30 p-4 rounded-full w-fit mx-auto">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <h4 className="font-medium mb-2">No Keywords Yet</h4>
                <p className="text-muted-foreground text-sm mb-4">
                  Add some relevant keywords to get started with your Pinterest SEO strategy.
                </p>
                <KeywordTemplates onAddKeywords={handleAddFromTemplate} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Generation Section */}
        {selectedTarget && (
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {/* SEO Article Prompt Generator */}
            <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-2xl shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-primary">
                  SEO Article Prompt
                </h3>
              </div>
              <p className="text-muted-foreground mb-4 text-sm">
                Generate a comprehensive SEO article prompt with your target keyword and relevant keywords.
              </p>
              <Button
                onClick={handleGeneratePrompt}
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-glow transition-all duration-300"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Article Prompt
              </Button>
            </div>

            {/* Pinterest Prompt Generator */}
            <div className="p-6 bg-gradient-to-br from-pinterest/5 to-pinterest-red-dark/5 border border-pinterest/20 rounded-2xl shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-pinterest/10">
                  <Target className="h-5 w-5 text-pinterest" />
                </div>
                <h3 className="text-lg font-semibold text-pinterest">
                  Pinterest Pin Prompt
                </h3>
              </div>
              <p className="text-muted-foreground mb-4 text-sm">
                Generate Pinterest titles & descriptions with hashtags using your keywords.
              </p>
              <Button
                onClick={handleGeneratePinterestPrompt}
                className="w-full bg-gradient-to-r from-pinterest to-pinterest-red-dark hover:from-pinterest/90 hover:to-pinterest-red-dark/90 text-white shadow-glow transition-all duration-300"
              >
                <Target className="h-4 w-4 mr-2" />
                Generate Pinterest Prompt
              </Button>
            </div>

            {/* Image Generation Prompt */}
            <div className="p-6 bg-gradient-to-br from-orange-500/5 to-amber-500/5 border border-orange-500/20 rounded-2xl shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-orange-500/10">
                  <Lightbulb className="h-5 w-5 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-orange-500">
                  Image Generation Prompt
                </h3>
              </div>
              <p className="text-muted-foreground mb-4 text-sm">
                Generate Pinterest pin design prompts with random hooks and CTAs for image creation.
              </p>
              <Button
                onClick={handleGenerateImagePrompt}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-500/90 hover:to-amber-500/90 text-white shadow-glow transition-all duration-300"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Generate Image Prompt
              </Button>
            </div>
          </div>
        )}

        {/* Bulk Operations Floating Panel */}
        <BulkOperations
          selectedKeywords={selectedKeywords}
          totalKeywords={selectedTarget.relevantKeywords.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onDeleteSelected={handleDeleteSelected}
          onCopySelected={handleCopySelected}
          onExportSelected={handleExportSelected}
        />
      </div>
    </div>
  );
};